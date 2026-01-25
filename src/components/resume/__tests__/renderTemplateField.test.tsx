import { renderTemplateField } from "@/components/resume/renderTemplateField";
import { render, screen } from "@testing-library/react";

describe("renderTemplateField", () => {
  it("returns null for empty value", () => {
    const { container } = render(
      <>{renderTemplateField({ id: "test" }, null)}</>,
    );
    expect(container.firstChild).toBeNull();
  });

  it("returns null for empty array", () => {
    const { container } = render(
      <>{renderTemplateField({ id: "test" }, [])}</>,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders summary correctly", () => {
    render(<>{renderTemplateField({ id: "summary" }, "My summary")}</>);
    expect(screen.getByText("My summary")).toHaveClass("text-lg");
  });

  it("renders skills correctly", () => {
    render(<>{renderTemplateField({ id: "skills" }, ["React", "Node"])}</>);
    expect(screen.getByText("React")).toBeInTheDocument();
    expect(screen.getByText("Node")).toBeInTheDocument();
    expect(screen.getByLabelText("Skills")).toBeInTheDocument();
  });

  it("renders projects correctly", () => {
    const projects = [
      {
        headline: "Project 1",
        subline: "Company 1",
        meta: "2021",
        description: "Desc 1",
        technologies: ["React"],
        url: "http://test.com",
      },
    ];
    render(<>{renderTemplateField({ id: "projects" }, projects)}</>);
    expect(screen.getByText("Project 1")).toBeInTheDocument();
    expect(screen.getByText("Company 1")).toBeInTheDocument();
    expect(screen.getByText("2021")).toBeInTheDocument();
    expect(screen.getByText("Desc 1")).toBeInTheDocument();
    expect(screen.getByText("React")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /View project/i })).toHaveAttribute(
      "href",
      "http://test.com",
    );
  });

  it("renders projects without optional fields", () => {
    const projects = [{ headline: "Project Only" }];
    render(<>{renderTemplateField({ id: "projects" }, projects)}</>);
    expect(screen.getByText("Project Only")).toBeInTheDocument();
    expect(screen.queryByText("View project")).not.toBeInTheDocument();
  });

  it("renders complex_list correctly", () => {
    const items = [
      {
        headline: "Item 1",
        subline: "Sub 1",
        meta: "Meta 1",
        description: "Desc 1",
        bullets: ["Bullet 1", "Bullet 2"],
      },
    ];
    render(
      <>{renderTemplateField({ id: "exp", type: "complex_list" }, items)}</>,
    );
    expect(screen.getByText("Item 1")).toBeInTheDocument();
    expect(screen.getByText("Bullet 1")).toBeInTheDocument();
    expect(screen.getByText("Bullet 2")).toBeInTheDocument();
  });

  it("renders complex_list without optional fields", () => {
    const items = [{ headline: "Item Only" }];
    render(
      <>{renderTemplateField({ id: "exp", type: "complex_list" }, items)}</>,
    );
    expect(screen.getByText("Item Only")).toBeInTheDocument();
  });

  it("renders list correctly", () => {
    render(
      <>
        {renderTemplateField({ id: "simple", type: "list" }, ["One", "Two"])}
      </>,
    );
    expect(screen.getByText("One")).toBeInTheDocument();
    expect(screen.getByText("Two")).toBeInTheDocument();
  });

  it("renders default fallback", () => {
    render(<>{renderTemplateField({ id: "other" }, "Simple text")}</>);
    expect(screen.getByText("Simple text")).toHaveClass("text-gray-700");
  });
});
