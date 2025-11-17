import React from "react";
import { render } from "../__support__/testUtils";
import { AuthBrand } from "../../components/auth/AuthBrand";

describe("AuthBrand", () => {
  it("renders brand heading and tagline", () => {
    const { getByText, container } = render(<AuthBrand />);

    // heading
    expect(getByText("SwitchCV")).toBeInTheDocument();

    // tagline
    expect(getByText("Your AI-powered resume platform")).toBeInTheDocument();

    // svg icon exists
    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
  });
});
