import { createElement } from "react";
import {
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  FileArchive,
  FileSpreadsheet,
  FileCode,
  File as FileGeneric,
  type LucideIcon,
} from "lucide-react";

function pickIcon(mimeType: string, originalName: string): LucideIcon {
  const ext = originalName.split(".").pop()?.toLowerCase() ?? "";

  if (mimeType.startsWith("image/")) return FileImage;
  if (mimeType.startsWith("video/")) return FileVideo;
  if (mimeType.startsWith("audio/")) return FileAudio;
  if (mimeType === "application/pdf") return FileText;
  if (["doc", "docx"].includes(ext)) return FileText;
  if (["xls", "xlsx", "csv"].includes(ext)) return FileSpreadsheet;
  if (["ppt", "pptx"].includes(ext)) return FileText;
  if (["zip", "rar", "7z"].includes(ext)) return FileArchive;
  if (["json", "js", "ts", "tsx", "jsx", "html", "css"].includes(ext))
    return FileCode;
  if (mimeType === "text/plain") return FileText;

  return FileGeneric;
}

const colorByCategory = (mimeType: string, ext: string): string => {
  if (mimeType.startsWith("image/")) return "text-purple-600 bg-purple-50";
  if (mimeType.startsWith("video/")) return "text-pink-600 bg-pink-50";
  if (mimeType.startsWith("audio/")) return "text-orange-600 bg-orange-50";
  if (mimeType === "application/pdf") return "text-red-600 bg-red-50";
  if (["doc", "docx"].includes(ext)) return "text-blue-600 bg-blue-50";
  if (["xls", "xlsx", "csv"].includes(ext)) return "text-green-600 bg-green-50";
  if (["zip", "rar", "7z"].includes(ext)) return "text-amber-600 bg-amber-50";
  return "text-slate-600 bg-slate-100";
};

export function FileIcon({
  mimeType,
  originalName,
  className = "size-5",
}: {
  mimeType: string;
  originalName: string;
  className?: string;
}) {
  const ext = originalName.split(".").pop()?.toLowerCase() ?? "";
  const colorClasses = colorByCategory(mimeType, ext);

  return (
    <span
      className={`inline-flex size-9 shrink-0 items-center justify-center rounded-lg ${colorClasses}`}
    >
      {createElement(pickIcon(mimeType, originalName), {
        className,
        "aria-hidden": true,
      })}
    </span>
  );
}
