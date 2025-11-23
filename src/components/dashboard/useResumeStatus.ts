export function getStatusDetails(
  resumeLoading: boolean,
  hasResume: boolean,
  isPublished: boolean
) {
  if (resumeLoading)
    return {
      label: "Loading...",
      textColor: "text-slate-400",
      bgColor: "bg-slate-800",
      borderColor: "border-slate-700",
      dotColor: "bg-slate-400",
      desc: "Fetching status...",
    };
  if (!hasResume)
    return {
      label: "Not Created",
      textColor: "text-slate-400",
      bgColor: "bg-slate-800/50",
      borderColor: "border-slate-700",
      dotColor: "bg-slate-500",
      desc: "Create a resume to get started.",
    };
  if (isPublished)
    return {
      label: "Live & Public",
      textColor: "text-emerald-400",
      bgColor: "bg-emerald-500/10",
      borderColor: "border-emerald-500/20",
      dotColor: "bg-emerald-400",
      desc: "Visible to recruiters. Your profile is active in search.",
    };
  return {
    label: "Private Draft",
    textColor: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/20",
    dotColor: "bg-amber-400",
    desc: "Hidden from search. Only you can view and edit.",
  };
}
