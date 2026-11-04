import * as ContextMenu from "@radix-ui/react-context-menu";
import type { ComponentPropsWithoutRef } from "react";
import { cn } from "../../lib/utils";

// Context menu content styled for the app, kept a little away from the window edges
export function ContextMenuContent({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof ContextMenu.Content>) {
  return (
    <ContextMenu.Content
      collisionPadding={8}
      className={cn(
        "min-w-44 bg-bg border border-border rounded-md shadow-lg py-1 z-50",
        className,
      )}
      {...props}
    />
  );
}
