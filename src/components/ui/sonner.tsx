import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      // top-center keeps notifications away from thumb-zone CTAs and the
      // bottom nav. The mobile offset pushes toasts below HomeHeader
      // (h-14 = 56px) plus iOS notch / Android status bar so they don't
      // overlap the search/bell/heart/cart row.
      position="top-center"
      mobileOffset={{ top: "calc(56px + env(safe-area-inset-top))" }}
      offset={{ top: "calc(56px + env(safe-area-inset-top))" }}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
