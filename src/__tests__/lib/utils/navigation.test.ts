import { reloadPage } from "@/lib/utils/navigation";
import * as windowUtils from "@/lib/utils/window";

describe("navigation", () => {
  it("should reload the page", () => {
    const reloadMock = jest.fn();
    jest.spyOn(windowUtils, "getWindow").mockReturnValue({
      location: { reload: reloadMock },
    } as unknown as Window);

    reloadPage();
    expect(reloadMock).toHaveBeenCalled();
  });
});
