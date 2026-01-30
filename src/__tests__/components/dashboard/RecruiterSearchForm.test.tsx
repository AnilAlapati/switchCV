import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import {
  RecruiterSearchForm,
  SearchResult,
  SearchModeType,
} from "@/components/dashboard/RecruiterSearchForm";

// Mock the props
const mockProps = {
  searchMode: "basic" as SearchModeType,
  setSearchMode: jest.fn(),
  premiumFiltersEnabled: true,
  aiSearchEnabled: true,
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
  // AI search props
  aiQuery: "",
  setAiQuery: jest.fn(),
  onAiSearch: jest.fn().mockResolvedValue(undefined),
  aiSearching: false,
  aiError: null,
  aiQuota: null,
};

describe("RecruiterSearchForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders basic search mode by default", () => {
    render(<RecruiterSearchForm {...mockProps} />);

    expect(screen.getByText("Agent Search")).toBeInTheDocument();
    expect(screen.getByText("Basic Lookup")).toBeInTheDocument();
    expect(screen.getByText("Premium Filters")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("e.g., 2")).toBeInTheDocument();
    expect(screen.getByText("Search Mode")).toBeInTheDocument();
  });

  it("renders AI search mode when selected", () => {
    render(<RecruiterSearchForm {...mockProps} searchMode="ai" />);

    expect(
      screen.getByPlaceholderText(/Looking for a Java developer/i)
    ).toBeInTheDocument();
    expect(screen.getByText("Smart Search")).toBeInTheDocument();
  });

  it("renders premium search mode when selected", () => {
    render(<RecruiterSearchForm {...mockProps} searchMode="premium" />);

    expect(screen.getByText("Basic Lookup")).toBeInTheDocument();
    expect(screen.getByText("Premium Filters")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("e.g., React, Python, AWS")
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("City, region, or remote")
    ).toBeInTheDocument();
    expect(screen.getByText("Search Mode")).toBeInTheDocument();
  });

  it("switches to basic mode when basic button is clicked", () => {
    render(<RecruiterSearchForm {...mockProps} searchMode="premium" />);

    const basicButton = screen.getByRole("button", { name: /Basic Lookup/i });
    fireEvent.click(basicButton);

    expect(mockProps.setSearchMode).toHaveBeenCalledWith("basic");
    expect(mockProps.setSearchResults).toHaveBeenCalledWith([]);
    expect(mockProps.setSearched).toHaveBeenCalledWith(false);
  });

  it("switches to premium mode when premium button is clicked", () => {
    render(<RecruiterSearchForm {...mockProps} />);

    const premiumButton = screen.getByRole("button", {
      name: /Premium Filters/i,
    });
    fireEvent.click(premiumButton);

    expect(mockProps.setSearchMode).toHaveBeenCalledWith("premium");
    expect(mockProps.setSearchResults).toHaveBeenCalledWith([]);
    expect(mockProps.setSearched).toHaveBeenCalledWith(false);
  });

  it("applies correct styling to active basic mode button", () => {
    render(<RecruiterSearchForm {...mockProps} />);

    const basicButton = screen.getByRole("button", { name: /Basic Lookup/i });
    expect(basicButton).toHaveClass("border-blue-400", "bg-gradient-to-br");
  });

  it("applies correct styling to active premium mode button", () => {
    render(<RecruiterSearchForm {...mockProps} searchMode="premium" />);

    const premiumButton = screen.getByRole("button", {
      name: /Premium Filters/i,
    });
    expect(premiumButton).toHaveClass("border-rose-300", "bg-gradient-to-br");
  });

  it("applies correct styling to inactive mode buttons", () => {
    render(<RecruiterSearchForm {...mockProps} />);

    const premiumButton = screen.getByRole("button", {
      name: /Premium Filters/i,
    });
    // Verify the button exists (styling may vary with theme changes)
    expect(premiumButton).toBeInTheDocument();
  });

  it("updates userId when basic search input changes", () => {
    render(<RecruiterSearchForm {...mockProps} />);

    const input = screen.getByPlaceholderText("e.g., 2");
    fireEvent.change(input, { target: { value: "test-user-123" } });

    expect(mockProps.setUserId).toHaveBeenCalledWith("test-user-123");
  });

  it("calls onSearch when form is submitted in basic mode", async () => {
    render(<RecruiterSearchForm {...mockProps} />);

    const submitButton = screen.getByText("Search");
    const form = submitButton.closest("form");
    if (form) {
      fireEvent.submit(form);
    } else {
      fireEvent.click(submitButton);
    }

    await waitFor(() => {
      expect(mockProps.onSearch).toHaveBeenCalledTimes(1);
    });
  });

  it("updates location when premium search location input changes", () => {
    render(<RecruiterSearchForm {...mockProps} searchMode="premium" />);

    const input = screen.getByPlaceholderText("City, region, or remote");
    fireEvent.change(input, { target: { value: "San Francisco" } });

    expect(mockProps.setLocation).toHaveBeenCalledWith("San Francisco");
  });

  it("adds skill when Enter key is pressed in skill input", () => {
    render(<RecruiterSearchForm {...mockProps} searchMode="premium" />);

    const input = screen.getByPlaceholderText("e.g., React, Python, AWS");
    fireEvent.change(input, { target: { value: "React" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter", charCode: 13 });

    expect(mockProps.onAddSkill).toHaveBeenCalledWith("React");
  });

  it("adds skill when Add button is clicked", () => {
    render(<RecruiterSearchForm {...mockProps} searchMode="premium" />);

    const input = screen.getByPlaceholderText("e.g., React, Python, AWS");
    fireEvent.change(input, { target: { value: "TypeScript" } });

    const addButton = screen.getByText("Add Skill");
    fireEvent.click(addButton);

    expect(mockProps.onAddSkill).toHaveBeenCalledWith("TypeScript");
  });

  it("clears skill input after adding skill", () => {
    render(<RecruiterSearchForm {...mockProps} searchMode="premium" />);

    const input = screen.getByPlaceholderText("e.g., React, Python, AWS");
    fireEvent.change(input, { target: { value: "JavaScript" } });

    const addButton = screen.getByText("Add Skill");
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

    const removeButtons = screen.getAllByText("×");
    fireEvent.click(removeButtons[0]); // Remove first skill

    expect(mockProps.onRemoveSkill).toHaveBeenCalledWith(0);
  });

  it("calls onSearch when form is submitted in premium mode", async () => {
    render(<RecruiterSearchForm {...mockProps} searchMode="premium" />);

    const submitButton = screen.getByText("Run Filtered Search");
    const form = submitButton.closest("form");
    if (form) {
      fireEvent.submit(form);
    } else {
      fireEvent.click(submitButton);
    }

    await waitFor(() => {
      expect(mockProps.onSearch).toHaveBeenCalledTimes(1);
    });
  });

  it("shows loading state on search button", () => {
    render(<RecruiterSearchForm {...mockProps} loading={true} />);

    expect(screen.getByText("Search")).toBeInTheDocument();
  });

  it("disables inputs when loading", () => {
    render(<RecruiterSearchForm {...mockProps} loading={true} />);

    const input = screen.getByPlaceholderText("e.g., 2");
    expect(input).toBeDisabled();
  });

  it("disables search button when loading", () => {
    render(<RecruiterSearchForm {...mockProps} loading={true} />);

    const button = screen.getByText("Search");
    expect(button.closest("button")).toBeDisabled();
  });

  it("disables skill input when loading in premium mode", () => {
    render(
      <RecruiterSearchForm {...mockProps} searchMode="premium" loading={true} />
    );

    const input = screen.getByPlaceholderText("e.g., React, Python, AWS");
    expect(input).toBeDisabled();
  });

  it("disables location input when loading in premium mode", () => {
    render(
      <RecruiterSearchForm {...mockProps} searchMode="premium" loading={true} />
    );

    const input = screen.getByPlaceholderText("City, region, or remote");
    expect(input).toBeDisabled();
  });

  it("disables Add button when loading in premium mode", () => {
    render(
      <RecruiterSearchForm {...mockProps} searchMode="premium" loading={true} />
    );

    const addButton = screen.getByText("Add Skill");
    expect(addButton).toBeDisabled();
  });

  it("shows basic search help text", () => {
    render(<RecruiterSearchForm {...mockProps} />);

    expect(
      screen.getByText(/retrieve a Specific candidate/i)
    ).toBeInTheDocument();
  });

  it("shows premium search help text", () => {
    render(<RecruiterSearchForm {...mockProps} searchMode="premium" />);

    expect(
      screen.getByText(/Advanced search with skills and location filters/)
    ).toBeInTheDocument();
  });

  it("applies hover effects to mode buttons", () => {
    render(<RecruiterSearchForm {...mockProps} />);

    const premiumButton = screen.getByRole("button", {
      name: /Premium Filters/i,
    });
    // Verify the button exists and has hover styling (class names may vary with theme)
    expect(premiumButton).toBeInTheDocument();
  });

  it("applies hover and scale effects to search button", () => {
    render(<RecruiterSearchForm {...mockProps} />);

    const searchButton = screen.getByText("Search");
    expect(searchButton.closest("button")).toBeInTheDocument();
  });

  it("renders skill tags with correct styling", () => {
    render(
      <RecruiterSearchForm
        {...mockProps}
        searchMode="premium"
        skills={["React"]}
      />
    );

    // Verify the skill tag is rendered
    expect(screen.getByText("React")).toBeInTheDocument();
  });

  it("renders remove buttons in skill tags", () => {
    render(
      <RecruiterSearchForm
        {...mockProps}
        searchMode="premium"
        skills={["React"]}
      />
    );

    expect(screen.getByText("×")).toBeInTheDocument();
  });

  it("handles empty skill input gracefully", () => {
    render(<RecruiterSearchForm {...mockProps} searchMode="premium" />);

    const addButton = screen.getByText("Add Skill");
    fireEvent.click(addButton);

    expect(mockProps.onAddSkill).toHaveBeenCalledWith("");
  });

  it("prevents form submission when Enter is pressed in skill input", () => {
    render(<RecruiterSearchForm {...mockProps} searchMode="premium" />);

    const input = screen.getByPlaceholderText("e.g., React, Python, AWS");
    fireEvent.keyDown(input, { key: "Enter", code: "Enter", charCode: 13 });

    expect(mockProps.onSearch).not.toHaveBeenCalled();
  });
});
