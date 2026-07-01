import * as LucideIcons from "lucide-react";

const iconMap = {
  "arrow-right": LucideIcons.ArrowRight,
  "arrow-left": LucideIcons.ArrowLeft,
  "arrow-down": LucideIcons.ArrowDown,
  "arrow-up": LucideIcons.ArrowUp,
  "building-2": LucideIcons.Building2,
  "chevron-up": LucideIcons.ChevronUp,
  "chevron-down": LucideIcons.ChevronDown,
  "chevron-left": LucideIcons.ChevronLeft,
  "chevron-right": LucideIcons.ChevronRight,
  menu: LucideIcons.Menu,
  x: LucideIcons.X,
  phone: LucideIcons.Phone,
  shield: LucideIcons.Shield,
  users: LucideIcons.Users,
  "file-text": LucideIcons.FileText,
  calendar: LucideIcons.Calendar,
  "message-circle": LucideIcons.MessageCircle,
  "pen-tool": LucideIcons.PenTool,
  paintbrush: LucideIcons.Paintbrush,
  hammer: LucideIcons.Hammer,
  check: LucideIcons.Check,
  "map-pin": LucideIcons.MapPin,
  mail: LucideIcons.Mail,
  star: LucideIcons.Star,
  "move-horizontal": LucideIcons.MoveHorizontal,
  link: LucideIcons.Link,
  "maximize-2": LucideIcons.Maximize2,
  send: LucideIcons.Send,
  "share-2": LucideIcons.Share2,
  "folder-x": LucideIcons.FolderX,
  loader: LucideIcons.Loader2,
  "loader-circle": LucideIcons.LoaderCircle,
  "log-in": LucideIcons.LogIn,
  "log-out": LucideIcons.LogOut,
  plus: LucideIcons.Plus,
  "pencil": LucideIcons.Pencil,
  trash: LucideIcons.Trash2,
  "image-plus": LucideIcons.ImagePlus,
  "grip-vertical": LucideIcons.GripVertical,
  upload: LucideIcons.Upload,
  download: LucideIcons.Download,
  instagram: LucideIcons.Instagram,
  "at-sign": LucideIcons.AtSign,
  settings: LucideIcons.Settings,
  "help-circle": LucideIcons.HelpCircle,
  "list-checks": LucideIcons.ListChecks,
  "shopping-cart": LucideIcons.ShoppingCart,
  hand: LucideIcons.Hand,
};

export default function Icon({ name, className = "" }) {
  const IconComponent = iconMap[name];

  if (!IconComponent) {
    return null;
  }

  return <IconComponent className={className} />;
}
