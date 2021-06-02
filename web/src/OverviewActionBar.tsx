import {
  debounce,
  InputAdornment,
  InputProps,
  TextField,
} from "@material-ui/core"
import Menu from "@material-ui/core/Menu"
import MenuItem from "@material-ui/core/MenuItem"
import { PopoverOrigin } from "@material-ui/core/Popover"
import { makeStyles } from "@material-ui/core/styles"
import ExpandMoreIcon from "@material-ui/icons/ExpandMore"
import React, { ChangeEvent, useRef, useState } from "react"
import { useHistory } from "react-router"
import styled from "styled-components"
import { Alert } from "./alerts"
import { incr } from "./analytics"
import { ReactComponent as CheckmarkSvg } from "./assets/svg/checkmark.svg"
import { ReactComponent as CloseSvg } from "./assets/svg/close.svg"
import { ReactComponent as CopySvg } from "./assets/svg/copy.svg"
import { ReactComponent as FilterSvg } from "./assets/svg/filter.svg"
import { ReactComponent as LinkSvg } from "./assets/svg/link.svg"
import { InstrumentedButton } from "./instrumentedComponents"
import { displayURL } from "./links"
import LogActions from "./LogActions"
import { EMPTY_TERM, FilterLevel, FilterSet, FilterSource } from "./logfilters"
import { useLogStore } from "./LogStore"
import OverviewActionBarKeyboardShortcuts from "./OverviewActionBarKeyboardShortcuts"
import { usePathBuilder } from "./PathBuilder"
import SrOnly from "./SrOnly"
import {
  AnimDuration,
  Color,
  Font,
  FontSize,
  mixinResetButtonStyle,
  SizeUnit,
} from "./style-helpers"
import { ResourceName } from "./types"

type UIResource = Proto.v1alpha1UIResource
type Link = Proto.v1alpha1UIResourceLink

type OverviewActionBarProps = {
  // The current resource. May be null if there is no resource.
  resource?: UIResource

  // All the alerts for the current resource.
  alerts?: Alert[]

  // The current log filter.
  filterSet: FilterSet
}

type FilterSourceMenuProps = {
  id: string
  open: boolean
  anchorEl: Element | null
  onClose: () => void

  // The level button that this menu belongs to.
  level: FilterLevel

  // The current filter set.
  filterSet: FilterSet

  // The alerts for the current resource.
  alerts?: Alert[]
}

let useMenuStyles = makeStyles((theme) => ({
  root: {
    fontFamily: Font.sansSerif,
    fontSize: FontSize.smallest,
  },
}))

// Menu to filter logs by source (e.g., build-only, runtime-only).
function FilterSourceMenu(props: FilterSourceMenuProps) {
  let { id, anchorEl, level, open, filterSet, onClose } = props
  let alerts = props.alerts || []

  let classes = useMenuStyles()
  let history = useHistory()
  let l = history.location
  let onClick = (e: any) => {
    let source = e.currentTarget.getAttribute("data-filter")
    const search = createLogSearch(l.search, { source, level })
    history.push({
      pathname: l.pathname,
      search: search.toString(),
    })
    onClose()
  }

  let anchorOrigin: PopoverOrigin = {
    vertical: "bottom",
    horizontal: "right",
  }
  let transformOrigin: PopoverOrigin = {
    vertical: "top",
    horizontal: "right",
  }

  let allCount: null | number = null
  let buildCount: null | number = null
  let runtimeCount: null | number = null
  if (level != FilterLevel.all) {
    allCount = alerts.reduce(
      (acc, alert) => (alert.level == level ? acc + 1 : acc),
      0
    )
    buildCount = alerts.reduce(
      (acc, alert) =>
        alert.level == level && alert.source == FilterSource.build
          ? acc + 1
          : acc,
      0
    )
    runtimeCount = alerts.reduce(
      (acc, alert) =>
        alert.level == level && alert.source == FilterSource.runtime
          ? acc + 1
          : acc,
      0
    )
  }
  return (
    <Menu
      id={id}
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      disableScrollLock={true}
      keepMounted={true}
      anchorOrigin={anchorOrigin}
      transformOrigin={transformOrigin}
      getContentAnchorEl={null}
    >
      <MenuItem
        data-filter={FilterSource.all}
        classes={classes}
        onClick={onClick}
      >
        All Sources{allCount === null ? "" : ` (${allCount})`}
      </MenuItem>
      <MenuItem
        data-filter={FilterSource.build}
        classes={classes}
        onClick={onClick}
      >
        Build Only{buildCount === null ? "" : ` (${buildCount})`}
      </MenuItem>
      <MenuItem
        data-filter={FilterSource.runtime}
        classes={classes}
        onClick={onClick}
      >
        Runtime Only{runtimeCount === null ? "" : ` (${runtimeCount})`}
      </MenuItem>
    </Menu>
  )
}

let ButtonRoot = styled(InstrumentedButton)`
  font-family: ${Font.sansSerif};
  display: flex;
  align-items: center;
  padding: 8px 12px;
  margin: 0;

  background: ${Color.grayDark};

  border: 1px solid ${Color.grayLighter};
  box-sizing: border-box;
  border-radius: 4px;
  cursor: pointer;
  transition: color ${AnimDuration.default} ease,
    border-color ${AnimDuration.default} ease;
  color: ${Color.gray7};

  &.isEnabled {
    background: ${Color.gray7};
    color: ${Color.grayDark};
    border-color: ${Color.grayDarker};
  }
  &.isEnabled.isRadio {
    pointer-events: none;
  }

  & .fillStd {
    fill: ${Color.gray7};
    transition: fill ${AnimDuration.default} ease;
  }
  &.isEnabled .fillStd {
    fill: ${Color.grayDark};
  }

  &:active,
  &:focus {
    outline: none;
    border-color: ${Color.grayLightest};
  }
  &.isEnabled:active,
  &.isEnabled:focus {
    outline: none;
    border-color: ${Color.grayDarkest};
  }

  &:hover {
    color: ${Color.blue};
    border-color: ${Color.blue};
  }
  &:hover .fillStd {
    fill: ${Color.blue};
  }
  &.isEnabled:hover {
    color: ${Color.blueDark};
    border-color: ${Color.blueDark};
  }
  &.isEnabled:hover .fillStd {
    fill: ${Color.blue};
  }
`

let ButtonPill = styled.div`
  display: flex;
`

export let ButtonLeftPill = styled(ButtonRoot)`
  border-radius: 4px 0 0 4px;
  border-right: 0;

  &:hover + button {
    border-left-color: ${Color.blue};
  }
`
export let ButtonRightPill = styled(ButtonRoot)`
  border-radius: 0 4px 4px 0;
`

// Placeholder styles until design is ready
const FilterTermTextField = styled(TextField)`
  & .MuiOutlinedInput-root {
    border-radius: ${SizeUnit(0.125)};
    border: 1px solid ${Color.grayLighter};
    background-color: ${Color.gray};
    transition: border-color ${AnimDuration.default} ease;

    &:hover {
      border-color: ${Color.blue};
    }
    & fieldset {
      border-color: 1px solid ${Color.grayLighter};
    }
    &:hover fieldset {
      border: 1px solid ${Color.grayLighter};
    }
    & .Mui-focused fieldset {
      border: 1px solid ${Color.grayLighter};
    }
    & .MuiOutlinedInput-input {
      padding: ${SizeUnit(0.2)};
    }
  }

  & .MuiInputBase-input {
    font-family: ${Font.monospace};
    color: ${Color.gray7};
    font-size: ${FontSize.small};
  }
`

const ClearFilterTermTextButton = styled(InstrumentedButton)`
  ${mixinResetButtonStyle}
  align-items: center;
  display: flex;
`

type FilterRadioButtonProps = {
  // The level that this button toggles.
  level: FilterLevel

  // The current filter set.
  filterSet: FilterSet

  // All the alerts for the current resource.
  alerts?: Alert[]
}

function createLogSearch(
  currentSearch: string,
  {
    level,
    source,
    term,
  }: { level?: FilterLevel; source?: FilterSource; term?: string }
) {
  // Start with the existing search params
  const newSearch = new URLSearchParams(currentSearch)

  if (level !== undefined) {
    newSearch.set("level", level)
  }

  if (source !== undefined) {
    newSearch.set("source", source)
  }

  if (term !== undefined) {
    newSearch.set("term", term)
  }

  return newSearch
}

export function FilterRadioButton(props: FilterRadioButtonProps) {
  let { level, filterSet } = props
  let alerts = props.alerts || []
  let leftText = "All Levels"
  let count = alerts.reduce(
    (acc, alert) => (alert.level == level ? acc + 1 : acc),
    0
  )
  if (level === FilterLevel.warn) {
    leftText = `Warnings (${count})`
  } else if (level === FilterLevel.error) {
    leftText = `Errors (${count})`
  }

  let isEnabled = level === props.filterSet.level
  let rightText = (
    <ExpandMoreIcon
      style={{ width: "16px", height: "16px" }}
      key="right-text"
    />
  )
  let rightStyle = { paddingLeft: "4px", paddingRight: "4px" } as any
  if (isEnabled) {
    if (filterSet.source == FilterSource.build) {
      rightText = <span key="right-text">Build</span>
      rightStyle = null
    } else if (filterSet.source == FilterSource.runtime) {
      rightText = <span key="right-text">Runtime</span>
      rightStyle = null
    }
  }

  // isRadio indicates that clicking the button again won't turn it off,
  // behaving like a radio button.
  let leftClassName = "isRadio"
  let rightClassName = ""
  if (isEnabled) {
    leftClassName += " isEnabled"
    rightClassName += " isEnabled"
  }

  let history = useHistory()
  let l = history.location
  let onClick = () => {
    const search = createLogSearch(l.search, {
      level,
      source: FilterSource.all,
    })
    history.push({
      pathname: l.pathname,
      search: search.toString(),
    })
  }

  let rightPillRef = useRef(null as any)
  let [sourceMenuAnchor, setSourceMenuAnchor] = useState(null)
  let onMenuOpen = (e: any) => {
    setSourceMenuAnchor(e.currentTarget)
  }
  let sourceMenuOpen = !!sourceMenuAnchor

  return (
    <ButtonPill style={{ marginRight: SizeUnit(0.5) }}>
      <ButtonLeftPill
        className={leftClassName}
        onClick={onClick}
        analyticsName="ui.web.filterLevel"
        analyticsTags={{ level: level, source: props.filterSet.source }}
      >
        {leftText}
      </ButtonLeftPill>
      <ButtonRightPill
        style={rightStyle}
        className={rightClassName}
        onClick={onMenuOpen}
        analyticsName="ui.web.filterSourceMenu"
      >
        {rightText}
      </ButtonRightPill>
      <FilterSourceMenu
        id={`filterSource-${level}`}
        open={sourceMenuOpen}
        anchorEl={sourceMenuAnchor}
        filterSet={filterSet}
        level={level}
        alerts={alerts}
        onClose={() => setSourceMenuAnchor(null)}
      />
    </ButtonPill>
  )
}

function FilterTermField(props: { filterSet: FilterSet }) {
  const globalTerm = props.filterSet.term
  const [filterTerm, setFilterTerm] = useState(
    globalTerm.sourceTerm ?? EMPTY_TERM
  )

  const history = useHistory()
  const location = history.location

  const inputProps: InputProps = {
    startAdornment: (
      <InputAdornment position="start" disablePointerEvents={true}>
        <FilterSvg fill={Color.grayDark} role="presentation" />
      </InputAdornment>
    ),
  }

  // If there's a search term, add a button to clear that term
  if (filterTerm) {
    const onClearClick = () => {
      // Clear the input field's value
      setFilterTerm(EMPTY_TERM)

      // Clear the global term's value
      const emptyTermSearch = createLogSearch(location.search, {
        term: EMPTY_TERM,
      })
      history.push({
        pathname: location.pathname,
        search: emptyTermSearch.toString(),
      })
    }

    const endAdornment = (
      <InputAdornment position="end">
        <ClearFilterTermTextButton analyticsName="TODO" onClick={onClearClick}>
          <SrOnly>Clear filter term</SrOnly>
          <CloseSvg fill={Color.grayLightest} role="presentation" />
        </ClearFilterTermTextButton>
      </InputAdornment>
    )

    inputProps.endAdornment = endAdornment
  }

  const debounceFilterLogs = debounce((search: string) => {
    history.push({ pathname: location.pathname, search })
  }, 500)

  /**
   * Note: debouncing allows us to wait to execute log filtration until a set
   * amount of time has passed without the filter term changing. To implement
   * debouncing, it's necessary to separate the term field's value from the url
   * search params, otherwise the field that a user types in doesn't update.
   * The term field updates without any debouncing, while the url search params
   * (which actually triggers log filtering) updates with the debounce delay.
   */
  const onChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const term = event.target.value ?? EMPTY_TERM
    const search = createLogSearch(location.search, { term })

    setFilterTerm(term)
    debounceFilterLogs(search.toString())
  }

  return (
    <>
      <FilterTermTextField
        aria-invalid={globalTerm.invalid}
        id="FilterTermTextInput"
        InputProps={inputProps}
        onChange={onChange}
        placeholder="Filter logs by string"
        value={filterTerm}
        variant="outlined"
      />
      <SrOnly component="label" htmlFor="FilterTermTextInput">
        Filter resource logs by string
      </SrOnly>
    </>
  )
}

type CopyButtonProps = {
  podId: string
}

async function copyTextToClipboard(text: string, cb: () => void) {
  await navigator.clipboard.writeText(text)
  cb()
}

let TruncateText = styled.div`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 250px;
`

function CopyButton(props: CopyButtonProps) {
  let [showCopySuccess, setShowCopySuccess] = useState(false)

  let copyClick = () => {
    copyTextToClipboard(props.podId, () => {
      setShowCopySuccess(true)

      setTimeout(() => {
        setShowCopySuccess(false)
      }, 5000)
    })
  }

  let icon = showCopySuccess ? (
    <CheckmarkSvg width="20" height="20" />
  ) : (
    <CopySvg width="20" height="20" />
  )

  return (
    <ButtonRoot onClick={copyClick} analyticsName="ui.web.actionBar.copyPodID">
      {icon}
      <TruncateText style={{ marginLeft: "8px" }}>
        {props.podId} Pod ID
      </TruncateText>
    </ButtonRoot>
  )
}

let ActionBarRoot = styled.div`
  background-color: ${Color.grayDarkest};
`

export let ActionBarTopRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid ${Color.grayLighter};
  padding: ${SizeUnit(0.25)} ${SizeUnit(0.5)};
`

let ActionBarBottomRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  border-bottom: 1px solid ${Color.grayLighter};
  padding: ${SizeUnit(0.25)} ${SizeUnit(0.5)};
`

type ActionBarProps = {
  endpoints: Link[]
  podId: string
}

let EndpointSet = styled.div`
  display: flex;
  align-items: center;
  font-family: ${Font.monospace};
  font-size: ${FontSize.small};
`

export let Endpoint = styled.a`
  color: ${Color.gray7};
  transition: color ${AnimDuration.default} ease;

  &:hover {
    color: ${Color.blue};
  }
`

let EndpointIcon = styled(LinkSvg)`
  fill: ${Color.gray7};
  margin-right: ${SizeUnit(0.25)};
`

// TODO(nick): Put this in a global React Context object with
// other page-level stuffs
function openEndpointUrl(url: string) {
  // We deliberately don't use rel=noopener. These are trusted tabs, and we want
  // to have a persistent link to them (so that clicking on the same link opens
  // the same tab).
  window.open(url, url)
}

export default function OverviewActionBar(props: OverviewActionBarProps) {
  let { resource, filterSet, alerts } = props
  let endpoints = resource?.status?.endpointLinks || []
  let podId = resource?.status?.k8sResourceInfo?.podName || ""
  const resourceName = resource
    ? resource.metadata?.name || ""
    : ResourceName.all
  const isSnapshot = usePathBuilder().isSnapshot()
  const logStore = useLogStore()

  let endpointEls: any = []
  endpoints.forEach((ep, i) => {
    if (i !== 0) {
      endpointEls.push(<span key={`spacer-${i}`}>,&nbsp;</span>)
    }
    endpointEls.push(
      <Endpoint
        onClick={() => void incr("ui.web.endpoint", { action: "click" })}
        href={ep.url}
        // We use ep.url as the target, so that clicking the link re-uses the tab.
        target={ep.url}
        key={ep.url}
      >
        <TruncateText>{ep.name || displayURL(ep)}</TruncateText>
      </Endpoint>
    )
  })

  let copyButton = podId ? <CopyButton podId={podId} /> : <div>&nbsp;</div>

  let topRow =
    endpointEls.length || podId ? (
      <ActionBarTopRow key="top">
        {endpointEls.length ? (
          <EndpointSet>
            <EndpointIcon />
            {endpointEls}
          </EndpointSet>
        ) : (
          <EndpointSet />
        )}
        {copyButton}
      </ActionBarTopRow>
    ) : null

  return (
    <ActionBarRoot>
      <OverviewActionBarKeyboardShortcuts
        logStore={logStore}
        resourceName={resourceName}
        endpoints={endpoints}
        openEndpointUrl={openEndpointUrl}
      />
      {topRow}
      <ActionBarBottomRow>
        <FilterRadioButton
          level={FilterLevel.all}
          filterSet={props.filterSet}
          alerts={alerts}
        />
        <FilterRadioButton
          level={FilterLevel.error}
          filterSet={props.filterSet}
          alerts={alerts}
        />
        <FilterRadioButton
          level={FilterLevel.warn}
          filterSet={props.filterSet}
          alerts={alerts}
        />
        <FilterTermField filterSet={props.filterSet} />
        <LogActions resourceName={resourceName} isSnapshot={isSnapshot} />
      </ActionBarBottomRow>
    </ActionBarRoot>
  )
}
