import { useAuth } from "@/contexts/AuthContext";
import Icon from "@/components/common/Icon";

/**
 * Кнопка «Изменить» для блока главной; показывается только авторизованному админу.
 * @param {{ onClick: () => void, label?: string, className?: string }} props
 */
export default function EditBlockButton({ onClick, label = "Изменить", className = "" }) {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`absolute top-4 right-4 z-10 flex items-center gap-1.5 rounded-lg border border-brand/30 bg-[#2A2A28] px-3 py-1.5 text-sm text-brand hover:bg-brand/10 transition-colors ${className}`}
      title={label}
    >
      <Icon name="pencil" className="h-4 w-4" />
      <span>{label}</span>
    </button>
  );
}
