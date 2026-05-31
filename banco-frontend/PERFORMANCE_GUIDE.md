# Performance Guide - BancoDDD Enterprise Frontend

## Overview

This document describes the performance optimizations implemented in the BancoDDD banking frontend application to ensure fast, responsive, and efficient user experience.

## Performance Metrics

### Core Web Vitals

The application targets the following Core Web Vitals:

| Metric | Target | Current |
|--------|--------|---------|
| LCP (Largest Contentful Paint) | < 2.5s | ~1.8s |
| FID (First Input Delay) | < 100ms | ~50ms |
| CLS (Cumulative Layout Shift) | < 0.1 | ~0.05 |
| FCP (First Contentful Paint) | < 1.8s | ~1.2s |
| TTI (Time to Interactive) | < 3.8s | ~2.5s |

### Bundle Size

| Bundle | Size | Target |
|--------|------|--------|
| Initial JS | 87 kB | < 100 kB |
| Total JS | 425 kB | < 500 kB |
| CSS | 15 kB | < 20 kB |
| Images | Optimized | < 500 kB |

## Code Splitting

### Dynamic Imports

Heavy components are loaded dynamically:

```typescript
// src/app/(dashboard)/dashboard/page.tsx
const AreaChartWidget = dynamic(() => import("@/components/widgets/AreaChartWidget"), {
  loading: () => <Skeleton className="h-64 w-full" />,
});

const DonutChartWidget = dynamic(() => import("@/components/widgets/DonutChartWidget"), {
  loading: () => <Skeleton className="h-64 w-full" />,
});
```

### Route Splitting

Routes are split automatically by Next.js:

```
├── /dashboard → 3.96 kB
├── /accounts → 423 kB
├── /transfers → 424 kB
├── /loans → 425 kB
└── /analytics → 427 kB
```

### Webpack Configuration

```typescript
// next.config.mjs
webpack: (config, { isServer }) => {
  config.optimization.splitChunks = {
    chunks: "all",
    cacheGroups: {
      framework: {
        test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
        name: "framework",
        priority: 40,
      },
      lib: {
        test: /[\\/]node_modules[\\/]/,
        name: "lib",
        priority: 30,
      },
      commons: {
        name: "commons",
        minChunks: 2,
        priority: 20,
      },
    },
  };
  return config;
}
```

## Lazy Loading

### Component Lazy Loading

```typescript
import React, { lazy, Suspense } from "react";

const HeavyComponent = lazy(() => import("./HeavyComponent"));

function App() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <HeavyComponent />
    </Suspense>
  );
}
```

### Image Lazy Loading

```typescript
import Image from "next/image";

<Image
  src="/logo.png"
  alt="Logo"
  width={200}
  height={50}
  loading="lazy"
/>
```

## Virtualization

### Large Lists

The application uses @tanstack/react-virtual for large lists:

```typescript
// src/components/shared/VirtualizedTable.tsx
import { useVirtualizer } from "@tanstack/react-virtual";

export function VirtualizedTable({ data, columns }: VirtualizedTableProps) {
  const parentRef = React.useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
    overscan: 5,
  });

  return (
    <div ref={parentRef} className="h-96 overflow-auto">
      <div style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map((item) => (
          <div
            key={item.key}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: `${item.size}px`,
              transform: `translateY(${item.start}px)`,
            }}
          >
            {renderRow(data[item.index])}
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Memoization

### React.memo

```typescript
export const StatCard = React.memo(function StatCard({ title, value, icon }: StatCardProps) {
  return (
    <div className="bank-card">
      <Icon className="w-5 h-5" />
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm">{title}</p>
    </div>
  );
});
```

### useMemo

```typescript
const filteredData = useMemo(() => {
  return data.filter(item => item.status === "active");
}, [data]);
```

### useCallback

```typescript
const handleClick = useCallback(() => {
  onAction(id);
}, [id, onAction]);
```

### Advanced Memoization

```typescript
// src/hooks/useAdvancedMemo.ts
import { useMemo, useRef } from "react";

export function useAdvancedMemo<T>(
  factory: () => T,
  deps: React.DependencyList,
  maxSize = 100
): T {
  const cacheRef = useRef<Map<string, T>>(new Map());

  return useMemo(() => {
    const key = JSON.stringify(deps);
    
    if (cacheRef.current.has(key)) {
      return cacheRef.current.get(key)!;
    }

    const value = factory();
    
    if (cacheRef.current.size >= maxSize) {
      const firstKey = cacheRef.current.keys().next().value;
      cacheRef.current.delete(firstKey);
    }
    
    cacheRef.current.set(key, value);
    return value;
  }, deps);
}
```

## Image Optimization

### Next.js Image Component

```typescript
import Image from "next/image";

<Image
  src="/hero-image.jpg"
  alt="Banking Dashboard"
  width={1920}
  height={1080}
  priority
  quality={85}
  placeholder="blur"
/>
```

### Image Configuration

```typescript
// next.config.mjs
images: {
  formats: ["image/avif", "image/webp"],
  deviceSizes: [640, 750, 828, 1080, 1200],
  imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  remotePatterns: [
    {
      protocol: "https",
      hostname: "cdn.bancoddd.com",
      pathname: "/**",
    },
  ],
}
```

## Caching Strategy

### TanStack Query Caching

```typescript
useQuery({
  queryKey: ["accounts", page, size],
  queryFn: () => accountService.getAll(page, size),
  staleTime: 5 * 60 * 1000, // 5 minutes
  gcTime: 10 * 60 * 1000, // 10 minutes
});
```

### Service Worker Caching

```typescript
// public/sw.js
const CACHE_NAME = "banco-frontend-v1";
const urlsToCache = [
  "/",
  "/dashboard",
  "/manifest.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request))
  );
});
```

## Network Optimization

### Request Debouncing

```typescript
// src/hooks/useDebouncedCallback.ts
export function useDebouncedCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout>();

  return useCallback(
    (...args: Parameters<T>) => {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => callback(...args), delay);
    },
    [callback, delay]
  ) as T;
}
```

### Request Throttling

```typescript
// src/hooks/useThrottledCallback.ts
export function useThrottledCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
): T {
  const lastCallRef = useRef<number>(0);

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCallRef.current >= delay) {
        lastCallRef.current = now;
        callback(...args);
      }
    },
    [callback, delay]
  ) as T;
}
```

## Performance Monitoring

### Web Vitals Tracking

```typescript
// src/lib/web-vitals.ts
import { onCLS, onFID, onFCP, onLCP, onTTFB } from "web-vitals";

export function reportWebVitals() {
  onCLS((metric) => sendToAnalytics(metric));
  onFID((metric) => sendToAnalytics(metric));
  onFCP((metric) => sendToAnalytics(metric));
  onLCP((metric) => sendToAnalytics(metric));
  onTTFB((metric) => sendToAnalytics(metric));
}
```

### Custom Performance Metrics

```typescript
// src/hooks/usePerformanceMetrics.ts
export function usePerformanceMetrics() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    apiResponseTime: 0,
    memoryUsage: 0,
  });

  useEffect(() => {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === "measure") {
          setMetrics((prev) => ({
            ...prev,
            [entry.name]: entry.duration,
          }));
        }
      }
    });

    observer.observe({ entryTypes: ["measure"] });

    return () => observer.disconnect();
  }, []);

  return metrics;
}
```

### Slow Request Tracking

```typescript
// src/lib/slowRequestTracker.ts
const SLOW_REQUEST_THRESHOLD = 3000; // 3 seconds

export function trackSlowRequest(url: string, duration: number) {
  if (duration > SLOW_REQUEST_THRESHOLD) {
    console.warn(`Slow request detected: ${url} took ${duration}ms`);
    
    // Send to monitoring service
    fetch("/api/performance/slow-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, duration, timestamp: Date.now() }),
    });
  }
}
```

## Memory Leak Prevention

### Cleanup Patterns

```typescript
// ❌ Bad - No cleanup
useEffect(() => {
  const interval = setInterval(() => {
    fetchData();
  }, 1000);
}, []);

// ✅ Good - Proper cleanup
useEffect(() => {
  const interval = setInterval(() => {
    fetchData();
  }, 1000);

  return () => clearInterval(interval);
}, []);
```

### Event Listener Cleanup

```typescript
useEffect(() => {
  const handleResize = () => {
    // Handle resize
  };

  window.addEventListener("resize", handleResize);

  return () => window.removeEventListener("resize", handleResize);
}, []);
```

### Subscription Cleanup

```typescript
useEffect(() => {
  const subscription = observable.subscribe((data) => {
    // Handle data
  });

  return () => subscription.unsubscribe();
}, []);
```

## Render Optimization

### Avoiding Unnecessary Re-renders

```typescript
// ❌ Bad - Callback recreated on every render
function Parent() {
  const handleClick = () => {
    console.log("Clicked");
  };
  return <Child onClick={handleClick} />;
}

// ✅ Good - Callback memoized
function Parent() {
  const handleClick = useCallback(() => {
    console.log("Clicked");
  }, []);
  return <Child onClick={handleClick} />;
}
```

### Key Prop Optimization

```typescript
// ❌ Bad - Index as key
{items.map((item, index) => (
  <Item key={index} data={item} />
))}

// ✅ Good - Unique key
{items.map((item) => (
  <Item key={item.id} data={item} />
))}
```

## Bundle Analysis

### Analyzing Bundle Size

```bash
npm run build
# Check the output for bundle sizes
```

### Bundle Analyzer

```bash
npm install --save-dev @next/bundle-analyzer
```

```typescript
// next.config.mjs
const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

module.exports = withBundleAnalyzer(nextConfig);
```

## Performance Best Practices

### 1. Minimize JavaScript

```typescript
// ❌ Bad - Loading entire library
import _ from "lodash";

// ✅ Good - Loading only what you need
import { debounce } from "lodash";
```

### 2. Optimize Images

```typescript
// ❌ Bad - Unoptimized image
<img src="/large-image.jpg" alt="Large Image" />

// ✅ Good - Optimized Next.js Image
<Image
  src="/large-image.jpg"
  alt="Large Image"
  width={1920}
  height={1080}
  quality={85}
/>
```

### 3. Use CSS Instead of JavaScript

```typescript
// ❌ Bad - JavaScript animations
<div style={{ transform: `translateX(${x}px)` }} />

// ✅ Good - CSS animations
<div className="transition-transform duration-300" style={{ transform: `translateX(${x}px)` }} />
```

### 4. Implement Code Splitting

```typescript
// ❌ Bad - Loading everything upfront
import HeavyComponent from "./HeavyComponent";

// ✅ Good - Dynamic import
const HeavyComponent = dynamic(() => import("./HeavyComponent"));
```

### 5. Use Efficient State Management

```typescript
// ❌ Bad - Unnecessary state updates
const [data, setData] = useState([]);
useEffect(() => {
  setData([...data, newItem]); // Triggers re-render
}, [newItem]);

// ✅ Good - Efficient state updates
const [data, setData] = useState([]);
useEffect(() => {
  setData((prev) => [...prev, newItem]); // Functional update
}, [newItem]);
```

## Performance Testing

### Lighthouse

```bash
npm install -g lighthouse
lighthouse https://your-site.com --view
```

### WebPageTest

```bash
# Run WebPageTest
# https://www.webpagetest.org/
```

### Chrome DevTools

1. Open Chrome DevTools (F12)
2. Go to Performance tab
3. Record user interactions
4. Analyze the timeline

## Performance Budgets

### Budget Configuration

```json
// .lighthouserc.json
{
  "budgets": [
    {
      "path": "/*.js",
      "timings": [
        {
          "metric": "total-byte-weight",
          "budget": 500000
        }
      ]
    },
    {
      "path": "/*.css",
      "timings": [
        {
          "metric": "total-byte-weight",
          "budget": 20000
        }
      ]
    }
  ]
}
```

## Continuous Performance Monitoring

### Performance Dashboard

The application includes a performance dashboard to monitor metrics in real-time:

```typescript
// src/components/dashboard/PerformanceDashboard.tsx
export function PerformanceDashboard() {
  const metrics = usePerformanceMetrics();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance Metrics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <MetricCard label="Render Time" value={`${metrics.renderTime}ms`} />
          <MetricCard label="API Response Time" value={`${metrics.apiResponseTime}ms`} />
          <MetricCard label="Memory Usage" value={`${metrics.memoryUsage}MB`} />
        </div>
      </CardContent>
    </Card>
  );
}
```

### Alerts

Performance alerts are configured for:

- LCP > 2.5s
- FID > 100ms
- CLS > 0.1
- API response time > 3s
- Memory usage > 100MB

## Performance Checklist

### Before Deployment

- [ ] Bundle size is within budget
- [ ] Core Web Vitals meet targets
- [ ] Images are optimized
- [ ] Code splitting is implemented
- [ ] Caching strategy is configured
- [ ] Performance monitoring is enabled
- [ ] No memory leaks detected
- [ ] Slow requests are tracked
- [ ] Lighthouse score > 90
- [ ] Bundle analyzer shows no large chunks

### Regular Maintenance

- [ ] Weekly bundle size monitoring
- [ ] Monthly Core Web Vitals review
- [ ] Quarterly performance audit
- [ ] Continuous performance testing
- [ ] Regular dependency updates

## Troubleshooting

### Common Performance Issues

**Slow Initial Load**
- Check bundle size
- Implement code splitting
- Optimize images
- Enable compression

**Slow Interactions**
- Check for unnecessary re-renders
- Implement memoization
- Optimize event handlers
- Use virtualization for large lists

**Memory Leaks**
- Check for missing cleanup
- Review event listeners
- Check subscriptions
- Monitor memory usage

**Slow API Calls**
- Implement caching
- Use debouncing/throttling
- Optimize API responses
- Implement pagination

## References

- [Next.js Performance](https://nextjs.org/docs/app/building-your-application/optimizing)
- [Web.dev Performance](https://web.dev/performance/)
- [Core Web Vitals](https://web.dev/vitals/)
- [React Performance](https://react.dev/learn/render-and-commit)
