"use client";
import { forwardRef, type ForwardedRef } from "react";
import {
  Button as OriginalButton,
  type ButtonProps,
} from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { omit } from "radash";

interface Props extends ButtonProps {
  side?: "top" | "right" | "bottom" | "left";
  sideoffset?: number;
}

function ButtonWithTooltip(
  props: Props,
  forwardedRef: ForwardedRef<HTMLButtonElement>
) {
  if (props.title) {
    const { side = "top", sideoffset = 0 } = props;
    return (
      <TooltipProvider>
        <Tooltip delayDuration={100}>
          <TooltipTrigger asChild>
            <OriginalButton ref={forwardedRef} {...omit(props, ["title"])} />
          </TooltipTrigger>
          <TooltipContent
            side={side}
            sideOffset={sideoffset}
            className="max-md:hidden"
          >
            <p>{props.title}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  } else {
    return <OriginalButton {...props} />;
  }
}

const Button = forwardRef(ButtonWithTooltip);
Button.displayName = "ButtonWithTooltip";

export { Button };
