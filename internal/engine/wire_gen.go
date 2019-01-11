// Code generated by Wire. DO NOT EDIT.

//go:generate wire
//+build !wireinject

package engine

import (
	"context"
	"github.com/google/go-cloud/wire"
	"github.com/windmilleng/tilt/internal/build"
	"github.com/windmilleng/tilt/internal/docker"
	"github.com/windmilleng/tilt/internal/dockercompose"
	"github.com/windmilleng/tilt/internal/dockerfile"
	"github.com/windmilleng/tilt/internal/k8s"
	"github.com/windmilleng/tilt/internal/synclet"
	"github.com/windmilleng/wmclient/pkg/analytics"
	"github.com/windmilleng/wmclient/pkg/dirs"
)

// Injectors from wire.go:

func provideBuildAndDeployer(ctx context.Context, docker2 docker.Client, k8s2 k8s.Client, dir *dirs.WindmillDir, env k8s.Env, updateMode UpdateModeFlag, sCli synclet.SyncletClient, dcc dockercompose.DockerComposeClient) (BuildAndDeployer, error) {
	syncletManager := NewSyncletManagerForTests(k8s2, sCli)
	syncletBuildAndDeployer := NewSyncletBuildAndDeployer(syncletManager)
	containerUpdater := build.NewContainerUpdater(docker2)
	memoryAnalytics := analytics.NewMemoryAnalytics()
	localContainerBuildAndDeployer := NewLocalContainerBuildAndDeployer(containerUpdater, memoryAnalytics)
	console := build.DefaultConsole()
	writer := build.DefaultOut()
	labels := _wireLabelsValue
	dockerImageBuilder := build.NewDockerImageBuilder(docker2, console, writer, labels)
	imageBuilder := build.DefaultImageBuilder(dockerImageBuilder)
	cacheBuilder := build.NewCacheBuilder(docker2)
	engineUpdateMode, err := ProvideUpdateMode(updateMode, env)
	if err != nil {
		return nil, err
	}
	imageBuildAndDeployer := NewImageBuildAndDeployer(imageBuilder, cacheBuilder, k8s2, env, memoryAnalytics, engineUpdateMode)
	dockerComposeBuildAndDeployer := NewDockerComposeBuildAndDeployer(dcc)
	buildOrder := DefaultBuildOrder(syncletBuildAndDeployer, localContainerBuildAndDeployer, imageBuildAndDeployer, dockerComposeBuildAndDeployer, env, engineUpdateMode)
	compositeBuildAndDeployer := NewCompositeBuildAndDeployer(buildOrder)
	return compositeBuildAndDeployer, nil
}

var (
	_wireLabelsValue = dockerfile.Labels{}
)

func provideImageBuildAndDeployer(ctx context.Context, docker2 docker.Client, kClient k8s.Client, dir *dirs.WindmillDir) (*ImageBuildAndDeployer, error) {
	console := build.DefaultConsole()
	writer := build.DefaultOut()
	labels := _wireLabelsValue
	dockerImageBuilder := build.NewDockerImageBuilder(docker2, console, writer, labels)
	imageBuilder := build.DefaultImageBuilder(dockerImageBuilder)
	cacheBuilder := build.NewCacheBuilder(docker2)
	env := _wireEnvValue
	memoryAnalytics := analytics.NewMemoryAnalytics()
	updateModeFlag := _wireUpdateModeFlagValue
	updateMode, err := ProvideUpdateMode(updateModeFlag, env)
	if err != nil {
		return nil, err
	}
	imageBuildAndDeployer := NewImageBuildAndDeployer(imageBuilder, cacheBuilder, kClient, env, memoryAnalytics, updateMode)
	return imageBuildAndDeployer, nil
}

var (
	_wireEnvValue            = k8s.Env(k8s.EnvDockerDesktop)
	_wireUpdateModeFlagValue = UpdateModeFlag(UpdateModeAuto)
)

// wire.go:

var DeployerBaseWireSet = wire.NewSet(build.DefaultConsole, build.DefaultOut, wire.Value(dockerfile.Labels{}), wire.Value(UpperReducer), build.DefaultImageBuilder, build.NewCacheBuilder, build.NewDockerImageBuilder, NewImageBuildAndDeployer, build.NewContainerUpdater, NewSyncletBuildAndDeployer,
	NewLocalContainerBuildAndDeployer,
	NewDockerComposeBuildAndDeployer,
	DefaultBuildOrder, wire.Bind(new(BuildAndDeployer), new(CompositeBuildAndDeployer)), NewCompositeBuildAndDeployer,
	ProvideUpdateMode,
	NewGlobalYAMLBuildController,
)

var DeployerWireSetTest = wire.NewSet(
	DeployerBaseWireSet,
	NewSyncletManagerForTests,
)

var DeployerWireSet = wire.NewSet(
	DeployerBaseWireSet,
	NewSyncletManager,
)
