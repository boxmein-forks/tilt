package hud

import (
	"strings"

	"github.com/tilt-dev/tilt/pkg/logger"
	"github.com/tilt-dev/tilt/pkg/model"
	"github.com/tilt-dev/tilt/pkg/model/logstore"
)

type FilterSource string

const (
	FilterSourceAll     FilterSource = "all"
	FilterSourceBuild   FilterSource = "build"
	FilterSourceRuntime FilterSource = "runtime"
)

func (s FilterSource) String() string { return string(s) }

func NewLogFilter(
	source FilterSource,
	manifestName model.ManifestName,
	level logger.Level,
) LogFilter {
	r := LogFilter{
		source:       source,
		manifestName: manifestName,
		level:        level,
	}
	return r
}

type LogFilter struct {
	source       FilterSource
	manifestName model.ManifestName
	level        logger.Level
}

// The implementation is identical to isBuildSpanId in web/src/logs.ts.
func isBuildSpanID(spanID logstore.SpanID) bool {
	return strings.HasPrefix(string(spanID), "build:") || strings.HasPrefix(string(spanID), "cmdimage:")
}

// The implementation is identical to matchesLevelFilter in web/src/OverviewLogPane.tsx
func (f LogFilter) matchesLevelFilter(line logstore.LogLine) bool {
	if !f.level.AsSevereAs(logger.WarnLvl) {
		return true
	}

	return f.level == line.Level
}

// Matches Checks if this line matches the current filter.
// The implementation is identical to matchesFilter in web/src/OverviewLogPane.tsx.
// except for term filtering as tools like grep can be used from the CLI.
func (f LogFilter) Matches(line logstore.LogLine) bool {
	if line.BuildEvent != "" {
		// Always leave in build event logs.
		// This makes it easier to see which logs belong to which builds.
		return true
	}

	if f.manifestName != "" && f.manifestName != line.ManifestName {
		return false
	}

	isBuild := isBuildSpanID(line.SpanID)
	if f.source == FilterSourceRuntime && isBuild {
		return false
	}

	if f.source == FilterSourceBuild && !isBuild {
		return false
	}

	return f.matchesLevelFilter(line)
}

func (f LogFilter) Apply(lines []logstore.LogLine) []logstore.LogLine {
	filtered := []logstore.LogLine{}
	for _, line := range lines {
		if f.Matches(line) {
			filtered = append(filtered, line)
		}
	}

	return filtered
}
