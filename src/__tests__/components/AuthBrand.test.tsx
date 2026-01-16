import React from "react";
import { render } from "../__support__/testUtils";
import { AuthBrand } from "../../components/auth/AuthBrand";

describe("AuthBrand", () => {
  it("renders brand heading and tagline", () => {
    const { getByText, container } = render(<AuthBrand />);

    // heading
    expect(getByText(/Switch/)).toBeInTheDocument();
    expect(getByText(/CV/)).toBeInTheDocument();

    // tagline
    expect(getByText("Autonomous Career Agent")).toBeInTheDocument();

    // svg icon exists
    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
  });
});
