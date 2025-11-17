import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import {
  RecruiterSearchForm,
  SearchResult,
} from "@/components/dashboard/RecruiterSearchForm";

// Mock the props
const mockProps = {
  searchMode: "basic" as const,
  setSearchMode: jest.fn(),
  userId: "",
  setUserId: jest.fn(),
  skills: [] as string[],
  location: "",
  setLocation: jest.fn(),
  loading: false,
  onSearch: jest.fn().mockResolvedValue(undefined),
  onAddSkill: jest.fn(),
  onRemoveSkill: jest.fn(),
  searchResults: [] as SearchResult[],
  setSearchResults: jest.fn(),
  setSearched: jest.fn(),
};

describe("RecruiterSearchForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders basic search mode by default", () => {
    render(<RecruiterSearchForm {...mockProps} />);

    expect(screen.getByText("🔍 Basic (ID Search)")).toBeInTheDocument();
    expect(screen.getByText("⭐ Premium (Advanced)")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Enter resume ID or user ID...")
    ).toBeInTheDocument();
    expect(screen.getByText("Search")).toBeInTheDocument();
  });

  it("renders premium search mode when selected", () => {
    render(<RecruiterSearchForm {...mockProps} searchMode="premium" />);

    expect(screen.getByText("🔍 Basic (ID Search)")).toBeInTheDocument();
    expect(screen.getByText("⭐ Premium (Advanced)")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Add a skill...")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Enter location...")
    ).toBeInTheDocument();
    expect(screen.getByText("Search")).toBeInTheDocument();
  });

  it("switches to basic mode when basic button is clicked", () => {
    render(<RecruiterSearchForm {...mockProps} searchMode="premium" />);

    const basicButton = screen.getByText("🔍 Basic (ID Search)");
    fireEvent.click(basicButton);

    expect(mockProps.setSearchMode).toHaveBeenCalledWith("basic");
    expect(mockProps.setSearchResults).toHaveBeenCalledWith([]);
    expect(mockProps.setSearched).toHaveBeenCalledWith(false);
  });

  it("switches to premium mode when premium button is clicked", () => {
    render(<RecruiterSearchForm {...mockProps} />);

    const premiumButton = screen.getByText("⭐ Premium (Advanced)");
    fireEvent.click(premiumButton);

    expect(mockProps.setSearchMode).toHaveBeenCalledWith("premium");
    expect(mockProps.setSearchResults).toHaveBeenCalledWith([]);
    expect(mockProps.setSearched).toHaveBeenCalledWith(false);
  });

  it("applies correct styling to active basic mode button", () => {
    render(<RecruiterSearchForm {...mockProps} />);

    const basicButton = screen.getByText("🔍 Basic (ID Search)");
    expect(basicButton).toHaveClass(
      "bg-amber-500/30",
      "text-amber-300",
      "border-amber-500/50"
    );
  });

  it("applies correct styling to active premium mode button", () => {
    render(<RecruiterSearchForm {...mockProps} searchMode="premium" />);

    const premiumButton = screen.getByText("⭐ Premium (Advanced)");
    expect(premiumButton).toHaveClass(
      "bg-purple-500/30",
      "text-purple-300",
      "border-purple-500/50"
    );
  });

  it("applies correct styling to inactive mode buttons", () => {
    render(<RecruiterSearchForm {...mockProps} />);

    const premiumButton = screen.getByText("⭐ Premium (Advanced)");
    expect(premiumButton).toHaveClass(
      "bg-white/10",
      "text-slate-300",
      "border-white/20"
    );
  });

  it("updates userId when basic search input changes", () => {
    render(<RecruiterSearchForm {...mockProps} />);

    const input = screen.getByPlaceholderText("Enter resume ID or user ID...");
    fireEvent.change(input, { target: { value: "test-user-123" } });

    expect(mockProps.setUserId).toHaveBeenCalledWith("test-user-123");
  });

  it("calls onSearch when form is submitted in basic mode", async () => {
    render(<RecruiterSearchForm {...mockProps} />);

    const submitButton = screen.getByText("Search");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockProps.onSearch).toHaveBeenCalledTimes(1);
    });
  });

  it("updates location when premium search location input changes", () => {
    render(<RecruiterSearchForm {...mockProps} searchMode="premium" />);

    const input = screen.getByPlaceholderText("Enter location...");
    fireEvent.change(input, { target: { value: "San Francisco" } });

    expect(mockProps.setLocation).toHaveBeenCalledWith("San Francisco");
  });

  it("adds skill when Enter key is pressed in skill input", () => {
    render(<RecruiterSearchForm {...mockProps} searchMode="premium" />);

    const input = screen.getByPlaceholderText("Add a skill...");
    fireEvent.change(input, { target: { value: "React" } });
    fireEvent.keyPress(input, { key: "Enter", code: "Enter", charCode: 13 });

    expect(mockProps.onAddSkill).toHaveBeenCalledWith("React");
  });

  it("adds skill when Add button is clicked", () => {
    render(<RecruiterSearchForm {...mockProps} searchMode="premium" />);

    const input = screen.getByPlaceholderText("Add a skill...");
    fireEvent.change(input, { target: { value: "TypeScript" } });

    const addButton = screen.getByText("Add");
    fireEvent.click(addButton);

    expect(mockProps.onAddSkill).toHaveBeenCalledWith("TypeScript");
  });

  it("clears skill input after adding skill", () => {
    render(<RecruiterSearchForm {...mockProps} searchMode="premium" />);

    const input = screen.getByPlaceholderText("Add a skill...");
    fireEvent.change(input, { target: { value: "JavaScript" } });

    const addButton = screen.getByText("Add");
    fireEvent.click(addButton);

    expect(input).toHaveValue("");
  });

  it("displays added skills as tags", () => {
    render(
      <RecruiterSearchForm
        {...mockProps}
        searchMode="premium"
        skills={["React", "TypeScript"]}
      />
    );

    expect(screen.getByText("React")).toBeInTheDocument();
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
  });

  it("removes skill when remove button is clicked", () => {
    render(
      <RecruiterSearchForm
        {...mockProps}
        searchMode="premium"
        skills={["React", "TypeScript"]}
      />
    );

    const removeButtons = screen.getAllByText("✕");
    fireEvent.click(removeButtons[0]); // Remove first skill

    expect(mockProps.onRemoveSkill).toHaveBeenCalledWith(0);
  });

  it("calls onSearch when form is submitted in premium mode", async () => {
    render(<RecruiterSearchForm {...mockProps} searchMode="premium" />);

    const submitButton = screen.getByText("Search");
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockProps.onSearch).toHaveBeenCalledTimes(1);
    });
  });

  it("shows loading state on search button", () => {
    render(<RecruiterSearchForm {...mockProps} loading={true} />);

    expect(screen.getByText("Searching...")).toBeInTheDocument();
  });

  it("disables inputs when loading", () => {
    render(<RecruiterSearchForm {...mockProps} loading={true} />);

    const input = screen.getByPlaceholderText("Enter resume ID or user ID...");
    expect(input).toBeDisabled();
  });

  it("disables search button when loading", () => {
    render(<RecruiterSearchForm {...mockProps} loading={true} />);

    const button = screen.getByText("Searching...");
    expect(button).toBeDisabled();
  });

  it("disables skill input when loading in premium mode", () => {
    render(
      <RecruiterSearchForm {...mockProps} searchMode="premium" loading={true} />
    );

    const input = screen.getByPlaceholderText("Add a skill...");
    expect(input).toBeDisabled();
  });

  it("disables location input when loading in premium mode", () => {
    render(
      <RecruiterSearchForm {...mockProps} searchMode="premium" loading={true} />
    );

    const input = screen.getByPlaceholderText("Enter location...");
    expect(input).toBeDisabled();
  });

  it("disables Add button when loading in premium mode", () => {
    render(
      <RecruiterSearchForm {...mockProps} searchMode="premium" loading={true} />
    );

    const addButton = screen.getByText("Add");
    expect(addButton).toBeDisabled();
  });

  it("shows basic search help text", () => {
    render(<RecruiterSearchForm {...mockProps} />);

    expect(screen.getByText(/💡 Enter the resume ID/)).toBeInTheDocument();
  });

  it("shows premium search help text", () => {
    render(<RecruiterSearchForm {...mockProps} searchMode="premium" />);

    expect(
      screen.getByText(/💡 Search by skills, location/)
    ).toBeInTheDocument();
  });

  it("applies hover effects to mode buttons", () => {
    render(<RecruiterSearchForm {...mockProps} />);

    const premiumButton = screen.getByText("⭐ Premium (Advanced)");
    expect(premiumButton).toHaveClass("hover:bg-white/15");
  });

  it("applies hover and scale effects to search button", () => {
    render(<RecruiterSearchForm {...mockProps} />);

    const searchButton = screen.getByText("Search");
    expect(searchButton).toHaveClass("hover:scale-105");
  });

  it("renders skill tags with correct styling", () => {
    render(
      <RecruiterSearchForm
        {...mockProps}
        searchMode="premium"
        skills={["React"]}
      />
    );

    const skillTag = screen.getByText("React").closest("span");
    expect(skillTag).toHaveClass(
      "bg-purple-500/20",
      "text-purple-300",
      "rounded-full"
    );
  });

  it("renders remove buttons in skill tags", () => {
    render(
      <RecruiterSearchForm
        {...mockProps}
        searchMode="premium"
        skills={["React"]}
      />
    );

    expect(screen.getByText("✕")).toBeInTheDocument();
  });

  it("handles empty skill input gracefully", () => {
    render(<RecruiterSearchForm {...mockProps} searchMode="premium" />);

    const addButton = screen.getByText("Add");
    fireEvent.click(addButton);

    expect(mockProps.onAddSkill).toHaveBeenCalledWith("");
  });

  it("prevents form submission when Enter is pressed in skill input", () => {
    render(<RecruiterSearchForm {...mockProps} searchMode="premium" />);

    const input = screen.getByPlaceholderText("Add a skill...");
    fireEvent.keyPress(input, { key: "Enter", code: "Enter", charCode: 13 });

    expect(mockProps.onSearch).not.toHaveBeenCalled();
  });
});
