export const getWindow = () => (typeof window !== "undefined" ? window : null);
export const redirectWindow = (url: string) => {
    if (typeof window !== "undefined") {
        window.location.assign(url);
    }
};
