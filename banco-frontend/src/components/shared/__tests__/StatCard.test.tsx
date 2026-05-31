import { render, screen } from "@testing-library/react";
import { StatCard } from "../StatCard";
import { DollarSign } from "lucide-react";

describe("StatCard", () => {
  it("should render title and value", () => {
    render(<StatCard title="Total Balance" value="$10,000" icon={DollarSign} />);
    expect(screen.getByText("Total Balance")).toBeInTheDocument();
    expect(screen.getByText("$10,000")).toBeInTheDocument();
  });

  it("should render trend when provided", () => {
    render(
      <StatCard 
        title="Balance" 
        value="$10,000" 
        icon={DollarSign} 
        trend={{ value: 5.2, label: "vs last month" }} 
      />
    );
    expect(screen.getByText("5.2%")).toBeInTheDocument();
    expect(screen.getByText("vs last month")).toBeInTheDocument();
  });

  it("should render subtitle when provided", () => {
    render(
      <StatCard 
        title="Balance" 
        value="$10,000" 
        icon={DollarSign} 
        subtitle="Available funds" 
      />
    );
    expect(screen.getByText("Available funds")).toBeInTheDocument();
  });

  it("should render loading state", () => {
    render(
      <StatCard 
        title="Balance" 
        value="$10,000" 
        icon={DollarSign} 
        loading={true} 
      />
    );
    expect(screen.queryByText("$10,000")).not.toBeInTheDocument();
  });

  it("should apply custom className", () => {
    const { container } = render(
      <StatCard 
        title="Balance" 
        value="$10,000" 
        icon={DollarSign} 
        className="custom-class" 
      />
    );
    expect(container.firstChild).toHaveClass("custom-class");
  });

  it("should render with different colors", () => {
    const { container: greenContainer } = render(
      <StatCard 
        title="Balance" 
        value="$10,000" 
        icon={DollarSign} 
        color="green" 
      />
    );
    expect(greenContainer.firstChild).toHaveClass("bg-emerald-500/15");

    const { container: redContainer } = render(
      <StatCard 
        title="Balance" 
        value="$10,000" 
        icon={DollarSign} 
        color="red" 
      />
    );
    expect(redContainer.firstChild).toHaveClass("bg-red-500/15");
  });
});
