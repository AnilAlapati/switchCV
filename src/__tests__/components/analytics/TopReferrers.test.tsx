import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { TopReferrers } from "@/components/analytics/TopReferrers";

describe("TopReferrers", () => {
  it("renders nothing when referrers is empty", () => {
    const { container } = render(<TopReferrers referrers={{}} />);
    expect(screen.getByText("No referral data yet")).toBeInTheDocument();
  });

  it("renders top 5 referrers sorted by count descending", () => {
    const referrers = {
      "google.com": 150,
      "linkedin.com": 200,
      "github.com": 50,
      "stackoverflow.com": 75,
      "reddit.com": 25,
      "twitter.com": 100,
    };

    render(<TopReferrers referrers={referrers} />);

    expect(screen.getByText("Referral Channels")).toBeInTheDocument();

    // Should show top 5 in order: linkedin.com (200), google.com (150), twitter.com (100), stackoverflow.com (75), github.com (50)
    expect(screen.getAllByText("Hits")).toHaveLength(5);

    // Check the order and counts
    expect(screen.getByText("linkedin.com")).toBeInTheDocument();
    expect(screen.getByText("200")).toBeInTheDocument();

    expect(screen.getByText("google.com")).toBeInTheDocument();
    expect(screen.getByText("150")).toBeInTheDocument();

    expect(screen.getByText("twitter.com")).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument();

    expect(screen.getByText("stackoverflow.com")).toBeInTheDocument();
    expect(screen.getByText("75")).toBeInTheDocument();

    expect(screen.getByText("github.com")).toBeInTheDocument();
    expect(screen.getByText("50")).toBeInTheDocument();
  });

  it("handles singular 'view' for count of 1", () => {
    const referrers = {
      "example.com": 1,
    };

    render(<TopReferrers referrers={referrers} />);

    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("Hits")).toBeInTheDocument();
  });

  it("displays 'Direct' for empty referrer string", () => {
    const referrers = {
      "": 50,
    };

    render(<TopReferrers referrers={referrers} />);

    expect(screen.getByText("Direct Link")).toBeInTheDocument();
  });

  it("limits to top 5 even when more referrers exist", () => {
    const referrers = {
      "site1.com": 100,
      "site2.com": 90,
      "site3.com": 80,
      "site4.com": 70,
      "site5.com": 60,
      "site6.com": 50, // Should not be shown
    };

    render(<TopReferrers referrers={referrers} />);

    expect(screen.getByText("site1.com")).toBeInTheDocument();
    expect(screen.getByText("site2.com")).toBeInTheDocument();
    expect(screen.getByText("site3.com")).toBeInTheDocument();
    expect(screen.getByText("site4.com")).toBeInTheDocument();
    expect(screen.getByText("site5.com")).toBeInTheDocument();

    expect(screen.queryByText("site6.com")).not.toBeInTheDocument();
  });

  it("renders the link icon", () => {
    const referrers = {
      "google.com": 10,
    };

    render(<TopReferrers referrers={referrers} />);

    expect(screen.getByText("🔗")).toBeInTheDocument();
  });
});
