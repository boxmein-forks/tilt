import { Typography } from "@material-ui/core"
import React, { ElementType } from "react"

// Question for the audience: Is there a type that covers just normal React-supported html properties, so I don't have to make my own type? This component may need to receive ARIA markup and other properties, like `htmlFor`.
type SrOnlyProps = {
  component?: ElementType // The component used for the root node
  htmlFor?: string
  id?: string
}

/**
 * A lightweight wrapper for content that should only be available
 * to assistive technology, using Material UI's Typography component
 * with `srOnly` class. Screen-reader-only classes are a common pattern
 * that allows useful content to be present in the DOM (and therefore
 * available to screen-readers), but not visible to sighted users.
 * https://material-ui.com/api/typography/
 */

export default function SrOnly(props: React.PropsWithChildren<SrOnlyProps>) {
  const component = props.component ?? "span"

  return (
    <Typography {...props} component={component} variant="srOnly">
      {props.children}
    </Typography>
  )
}
