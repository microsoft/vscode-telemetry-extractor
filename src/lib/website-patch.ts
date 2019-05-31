import { Events, Event } from "./events";
import { Property } from "./common-properties";

// There's a couple telemetry events our website collects and occasionally that might be useful to dump into the overall export
export function patchWebsiteEvents(currentEvents: Events) {
    const newUserInstall = new Event('websiteTracking/newUserInstall');
    newUserInstall.properties.push(new Property('campaignId', 'SystemMetaData', 'BusinessInsight', 'none'));
    newUserInstall.properties.push(new Property('googleAnalyticsClientId', 'SystemMetaData', 'BusinessInsight', 'GoogleAnalyticsId'));
    const dbconnectionlog = new Event('websitetracking/dbconnectionlog');
    dbconnectionlog.properties.push(new Property('log', 'CallstackOrException', 'PerformanceAndHealth', 'none'));
    const surveyResult = new Event('nps/surveyResult');
    surveyResult.properties.push(new Property('id', 'SystemMetaData', 'BusinessInsight', 'none'));
    surveyResult.properties.push(new Property('date', 'SystemMetaData', 'BusinessInsight', 'none'));
    surveyResult.properties.push(new Property('nps', 'SystemMetaData', 'BusinessInsight', 'none'));
    surveyResult.properties.push(new Property('dobetter', 'CustomerContent', 'BusinessInsight', 'none'));
    surveyResult.properties.push(new Property('changes', 'CustomerContent', 'BusinessInsight', 'none'));
    surveyResult.properties.push(new Property('name', 'CustomerContent', 'BusinessInsight', 'none'));
    surveyResult.properties.push(new Property('email', 'CustomerContent', 'BusinessInsight', 'none'));
    currentEvents.dataPoints.push(newUserInstall);
    currentEvents.dataPoints.push(dbconnectionlog);
    currentEvents.dataPoints.push(surveyResult);
}