import { render, screen, fireEvent } from "@testing-library/react";
import {
  FormInput,
  FormTextarea,
  FormSelect,
  VisibilityControl,
} from "@/components/onboarding/FormComponents";
import { Visibility } from "@/types";

jest.mock("@/components/VisibilityControls", () => ({
  VisibilityControls: ({
    value,
    onChange,
  }: {
    value: Visibility;
    onChange: (v: Visibility) => void;
  }) => (
    <button onClick={() => onChange("public")}>Mock Visibility: {value}</button>
  ),
}));

describe("FormComponents", () => {
  describe("FormInput", () => {
    it("renders with label and value", () => {
      render(<FormInput label="Test Label" value="Test Value" readOnly />);
      expect(screen.getByLabelText("Test Label")).toHaveValue("Test Value");
    });

    it("uses provided id", () => {
      render(<FormInput label="Test Label" id="custom-id" readOnly />);
      expect(screen.getByLabelText("Test Label")).toHaveAttribute(
        "id",
        "custom-id"
      );
    });
  });

  describe("FormTextarea", () => {
    it("renders with label and value", () => {
      render(<FormTextarea label="Test Area" value="Test Content" readOnly />);
      expect(screen.getByLabelText("Test Area")).toHaveValue("Test Content");
    });
  });

  describe("FormSelect", () => {
    it("renders with options and selects value", () => {
      const options = [
        { value: "opt1", label: "Option 1" },
        { value: "opt2", label: "Option 2" },
      ];
      const onChange = jest.fn();
      render(
        <FormSelect
          label="Test Select"
          options={options}
          value="opt1"
          onChange={onChange}
        />
      );

      expect(screen.getByLabelText("Test Select")).toHaveValue("opt1");
      fireEvent.change(screen.getByLabelText("Test Select"), {
        target: { value: "opt2" },
      });
      expect(onChange).toHaveBeenCalled();
    });
  });

  describe("VisibilityControl", () => {
    it("renders and calls onChange", () => {
      const onChange = jest.fn();
      render(<VisibilityControl value="public" onChange={onChange} />);

      expect(screen.getByText("Mock Visibility: public")).toBeInTheDocument();
      fireEvent.click(screen.getByText("Mock Visibility: public"));
      expect(onChange).toHaveBeenCalledWith("public");
    });
  });
});
