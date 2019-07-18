import React, { PureComponent } from "react"
import { ReactComponent as LogoWordmarkSvg } from "./assets/svg/logo-wordmark-gray.svg"
import AnsiLine from "./AnsiLine"
import TimeAgo from "react-timeago"
import "./AlertPane.scss"
import { zeroTime } from "./time"
import { Build, Resource } from "./types"
import { timeAgoFormatter } from "./timeFormatters"
import { podStatusIsCrash, podStatusIsError } from "./constants"

export type Alert = {
  alertType: string
  msg: string;
  timestamp: string;
  titleMsg: string;
}

//constants for Alert error types
export const PodRestartErrorType = "PodRestartError"
export const PodStatusErrorType = "PodStatusError"
export const ResourceCrashRebuildErrorType = "ResourceCrashRebuild"
export const BuildFailedErrorType = "BuildError"
export const WarningErrorType = "Warning"

//functions to create different kinds of alerts
function podStatusErrAlert(resource: AlertResource): Alert{
  let podStatus = resource.resourceInfo.podStatus
  let podStatusMessage = resource.resourceInfo.podStatusMessage
  let msg = ""
  if (podStatusIsCrash(podStatus)) {
      msg = resource.crashLog
  }
  msg = msg || podStatusMessage || `Pod has status ${podStatus}`

  return {alertType: PodStatusErrorType, titleMsg: resource.name, msg: msg, timestamp: resource.resourceInfo.podCreationTime}
}

function podRestartErrAlert(resource: AlertResource): Alert {
  let msg = resource.crashLog || ""
  let titleMsg = "Restarts:" + (resource.resourceInfo.podRestarts.toString())
  return {alertType: PodRestartErrorType, titleMsg: titleMsg ,msg: msg, timestamp: resource.resourceInfo.podCreationTime}
}

function crashRebuildErrAlert(resource: AlertResource): Alert {
  let msg = resource.crashLog || ""
  return {alertType: ResourceCrashRebuildErrorType, titleMsg: "Pod crashed", msg: msg, timestamp: resource.resourceInfo.podCreationTime}
}

function buildFailedErrAlert (resource: AlertResource): Alert {
  let msg = resource.buildHistory[0].Log || ""
  return {alertType: BuildFailedErrorType,titleMsg: resource.name, msg: msg, timestamp: resource.resourceInfo.podCreationTime}
}


class AlertResource {
  public name: string
  public buildHistory: Array<Build>
  public resourceInfo: ResourceInfo
  public crashLog: string
  public alertsArray: Array<Alert> 

  constructor(resource: Resource) {
    this.name = resource.Name
    this.buildHistory = resource.BuildHistory
    this.crashLog = resource.CrashLog
    if (resource.ResourceInfo) {
      let info = resource.ResourceInfo
      this.resourceInfo = {
        podCreationTime: info.PodCreationTime,
        podStatus: info.PodStatus,
        podStatusMessage: info.PodStatusMessage || "",
        podRestarts: info.PodRestarts,
      }
    } else {
      this.resourceInfo = { // used for testing
        podCreationTime: zeroTime,
        podStatus: "",
        podStatusMessage: "",
        podRestarts: 0,
      }
    }
    this.alertsArray = this.createAlerts()
  }

  public hasAlert() {
    return alertElements([this]).length > 0
  }

public crashRebuild() {
    return this.buildHistory.length > 0 && this.buildHistory[0].IsCrashRebuild
  }

  public podStatusIsError() {
    let podStatus = this.resourceInfo.podStatus
    let podStatusMessage = this.resourceInfo.podStatusMessage
    return podStatusIsError(podStatus) || podStatusMessage
  }

  public podRestarted() {
    return this.resourceInfo.podRestarts > 0
  }

  public buildFailed() {
    return this.buildHistory.length > 0 && this.buildHistory[0].Error !== null
  }

  public numberOfAlerts(): number {
    return alertElements([this]).length
  }

  public warnings(): Array<string> {
    if (this.buildHistory.length > 0) {
      return this.buildHistory[0].Warnings || []
    }

    return []
  }

  //function to create different kinds of alerts per AlertResource
  public createAlerts(): Array<Alert> {
    let alertArray: Array<Alert> = []
    
    if (this.resourceInfo.podStatus != undefined){
      if (this.podStatusIsError()){
        alertArray.push(podStatusErrAlert(this))
      } if (this.podRestarted()){
        alertArray.push(podRestartErrAlert(this))
      }
    } 
    if (this.crashRebuild()){
        alertArray.push(crashRebuildErrAlert(this))
    }
    return alertArray
  }

  public getAlerts(): Array<Alert> {
    return this.alertsArray
  }
}

type ResourceInfo = {
  podCreationTime: string
  podStatus: string
  podStatusMessage: string
  podRestarts: number
}

type AlertsProps = {
  resources: Array<AlertResource>
}

function logToLines(s: string) {
  return s.split("\n").map((l, i) => <AnsiLine key={"logLine" + i} line={l} />)
}


function alertElements(resources: Array<AlertResource>) {
  let formatter = timeAgoFormatter
  let alertElements: Array<JSX.Element> = []
  resources.forEach(r => {
    if (r.podStatusIsError()) {
      let podStatus = r.resourceInfo.podStatus
      let podStatusMessage = r.resourceInfo.podStatusMessage
      let msg = ""
      if (podStatusIsCrash(podStatus)) {
        msg = r.crashLog
      }

      msg = msg || podStatusMessage || `Pod has status ${podStatus}`

      alertElements.push(
        <li key={"resourceInfoError" + r.name} className="AlertPane-item">
          <header>
            <p>{r.name}</p>
            <p>
              <TimeAgo
                date={r.resourceInfo.podCreationTime}
                formatter={formatter}
              />
            </p>
          </header>
          <section>{logToLines(msg)}</section>
        </li>
      )
    } else if (r.podRestarted()) {
      alertElements.push(
        <li key={"resourceInfoPodCrash" + r.name} className="AlertPane-item">
          <header>
            <p>{r.name}</p>
            <p>{`Restarts: ${r.resourceInfo.podRestarts}`}</p>
          </header>
          <section>{logToLines(r.crashLog || "")}</section>
        </li>
      )
    } else if (r.crashRebuild()) {
      alertElements.push(
        <li
          key={"resourceInfoCrashRebuild" + r.name}
          className="AlertPane-item"
        >
          <header>
            <p>{r.name}</p>
            <p>Pod crashed!</p>
          </header>
          <section>{logToLines(r.crashLog || "")}</section>
        </li>
      )
    }
    let lastBuild = r.buildHistory[0]
    if (r.buildFailed()) {
      alertElements.push(
        <li key={"buildError" + r.name} className="AlertPane-item">
          <header>
            <p>{r.name}</p>
            <p>
              <TimeAgo date={lastBuild.FinishTime} formatter={formatter} />
            </p>
          </header>
          <section>{logToLines(lastBuild.Log || "")}</section>
        </li>
      )
    }
    r.warnings().forEach((w, i) => {
      alertElements.push(
        <li key={"warning" + r.name + i} className="AlertPane-item">
          <header>
            <p>{r.name}</p>
            <p>
              <TimeAgo date={lastBuild.FinishTime} formatter={formatter} />
            </p>
          </header>
          <section>{logToLines(w)}</section>
        </li>
      )
    })
  })

  return alertElements
}

class AlertPane extends PureComponent<AlertsProps> {
  render() {
    let el = (
      <section className="Pane-empty-message">
        <LogoWordmarkSvg />
        <h2>No Alerts Found</h2>
      </section>
    )

    let alerts = alertElements(this.props.resources)
    if (alerts.length > 0) {
      el = <ul>{alerts}</ul>
    }

    return <section className="AlertPane">{el}</section>
  }
}

export default AlertPane
export { AlertResource }
