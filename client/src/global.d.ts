// Re-export React's JSX namespace as global JSX for backwards compatibility
// Components using `JSX.Element` as a return type need this shim (React 18 moved it to React.JSX)
import type * as React from "react";
declare global {
  namespace JSX {
    type Element = React.JSX.Element;
    type ElementClass = React.JSX.ElementClass;
    type IntrinsicElements = React.JSX.IntrinsicElements;
  }
}
