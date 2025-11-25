import React from "react";
import { render } from "../__support__/testUtils";

// Mock the useAuth hook to return a user
jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { uid: "test-user" } }),
}));

// Mock child components to keep test focused
jest.mock("../../components/dashboard/RecruiterSearchForm", () => ({
  RecruiterSearchForm: () => <div data-testid="search-form" />,
}));

jest.mock("../../components/dashboard/RecruiterSearchResults", () => ({
  RecruiterSearchResults: () => <div data-testid="search-results" />,
}));

import { RecruiterSearchBox } from "../../components/dashboard/RecruiterSearchBox_new";

describe("RecruiterSearchBox", () => {
  it("renders header and child placeholders", () => {
    const { getByText, getByTestId } = render(<RecruiterSearchBox />);

    expect(getByText("Recruiter Resume Search")).toBeInTheDocument();
    expect(getByTestId("search-form")).toBeInTheDocument();
    expect(getByTestId("search-results")).toBeInTheDocument();
  });
});
