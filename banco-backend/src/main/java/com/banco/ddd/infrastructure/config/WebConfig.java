package com.banco.ddd.infrastructure.config;

import com.banco.ddd.shared.util.RequestIdFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Configuración MVC: registra filtros y configura CORS para Spring MVC.
 */
@Configuration
@RequiredArgsConstructor
public class WebConfig implements WebMvcConfigurer {

    private final CorsConfigurationSource corsConfigurationSource;

    /**
     * Registra el filtro CORS con la máxima prioridad para que se ejecute
     * antes que Spring Security.
     */
    @Bean
    public FilterRegistrationBean<CorsFilter> corsFilterRegistration() {
        FilterRegistrationBean<CorsFilter> bean =
                new FilterRegistrationBean<>(new CorsFilter(corsConfigurationSource));
        bean.setOrder(Integer.MIN_VALUE);
        return bean;
    }

    /**
     * Registra el filtro de Request ID para trazabilidad en logs.
     */
    @Bean
    public FilterRegistrationBean<RequestIdFilter> requestIdFilterRegistration(
            RequestIdFilter requestIdFilter) {
        FilterRegistrationBean<RequestIdFilter> bean = new FilterRegistrationBean<>(requestIdFilter);
        bean.setOrder(Integer.MIN_VALUE + 1);
        return bean;
    }
}
