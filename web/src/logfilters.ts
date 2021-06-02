// Types and parsing logic for log filters.

import { Location } from "history"
import { useHistory } from "react-router"

export const EMPTY_TERM = ""
export const EMPTY_FILTER_TERM: FilterTerm = {
  sourceTerm: EMPTY_TERM,
  filterTerm: null,
  invalid: false,
}

export enum FilterLevel {
  all = "",

  // Only show warnings.
  warn = "warn",

  // Only show errors.
  error = "error",
}

export enum FilterSource {
  all = "",

  // Only show build logs.
  build = "build",

  // Only show runtime logs.
  runtime = "runtime",
}

interface FilterTerm {
  sourceTerm: string // Unmodified string input
  filterTerm: RegExp | null // String input parsed into a RegExp, used for filtering
  invalid: boolean // True if the string input cannot be parsed
}

export type FilterSet = {
  level: FilterLevel
  source: FilterSource
  term: FilterTerm
}

export function parseFilterTerm(term: string): RegExp | null {
  if (!term) {
    return null
  }

  // Filter terms are case-insensitive and can match multiple instances
  return new RegExp(term, "gi")
}

// Infers filter set from the history React hook.
export function useFilterSet(): FilterSet {
  return filterSetFromLocation(useHistory().location)
}

// The source of truth for log filters is the URL.
// For example,
// /r/(all)/overview?level=error&source=build&term=docker
// will only show errors from the build, not from the pod,
// and that include the string `docker`.
export function filterSetFromLocation(l: Location): FilterSet {
  let params = new URLSearchParams(l.search)
  let filters: FilterSet = {
    level: FilterLevel.all,
    source: FilterSource.all,
    term: EMPTY_FILTER_TERM,
  }
  switch (params.get("level")) {
    case FilterLevel.warn:
      filters.level = FilterLevel.warn
      break
    case FilterLevel.error:
      filters.level = FilterLevel.error
      break
  }

  switch (params.get("source")) {
    case FilterSource.build:
      filters.source = FilterSource.build
      break
    case FilterSource.runtime:
      filters.source = FilterSource.runtime
      break
  }

  const sourceTerm = params.get("term")
  if (sourceTerm) {
    filters.term = {
      sourceTerm,
      filterTerm: parseFilterTerm(sourceTerm),
      invalid: false,
    }
  }

  return filters
}

export function filterSetsEqual(a: FilterSet, b: FilterSet): boolean {
  const sourceEqual = a.source === b.source
  const levelEqual = a.level === b.level
  // Filter terms are case-insensitive, so we can ignore casing when comparing terms
  const termEqual =
    a.term.sourceTerm.toLowerCase() === b.term.sourceTerm.toLowerCase()
  return sourceEqual && levelEqual && termEqual
}
