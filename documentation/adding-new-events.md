[Draft Content]

# Adding new telemetry to VS Code

The process of logging and annotating telemetry in the codebase is documented [here](typescript-code-annotations.md).

However, we want to limit telemetry bloat, and ensure that each event added to the product is in use.  So before adding telemetry, ask yourself the following questions:
- Will the event be used to gather essential business insight?  
- Is this an event that could make use of the "expiration"  tag (described in the Syntax section [here](comment-code-annotations.md))?
- Do you have an appropriate owner for the event - basically, a contact that can speak to its function and determine if it's still in use?

# Telemetry Catalog

The following is generated directly from the annotations in VS Code.

| Event             | Owner             | Link to Declaration   | Comment     |
| ----------------- | ----------------- | --------------------- | ----------- |
| monacoworkbench/extensiongallery:install |
| monacoworkbench/extensiongallery:uninstall |
| monacoworkbench/extensiongallery:update |
| monacoworkbench/galleryservice:downloadvsix |
| monacoworkbench/remoteextensionrecommendations:popup |
| monacoworkbench/query-expfeature |
| monacoworkbench/startuptimevaried |
| monacoworkbench/webviews:createwebviewpanel |
| monacoworkbench/editoropened |
| monacoworkbench/editorclosed |
| monacoworkbench/debugsessionstart |
| monacoworkbench/debugsessionstop |
| monacoworkbench/debug/didviewmemory |
| monacoworkbench/cessurvey:popup |
| monacoworkbench/cessurvey:schedule |
| monacoworkbench/watermark:open |
| monacoworkbench/searchresultsfirstrender |
| monacoworkbench/searchresultsfinished |
| monacoworkbench/searchresultsshown |
| monacoworkbench/exthostunresponsive |
| monacoworkbench/extension:enable |
| monacoworkbench/extension:disable |
| monacoworkbench/extensiongallery:openextension |
| monacoworkbench/extensiongallery:install:recommendations |
| monacoworkbench/workspce.tags |
| monacoworkbench/workspace.remotes |
| monacoworkbench/workspace.azure |
| monacoworkbench/webview.createwebview |
| monacoworkbench/terminallatencystats |
| monacoworkbench/languagepacksuggestion:popup |
| monacoworkbench/taskservice.engineversion |
| monacoworkbench/taskservice |
| monacoworkbench/settingseditor.settingmodified |
| monacoworkbench/settingseditor.filter |
| monacoworkbench/settingseditor.searcherror |
| monacoworkbench/workbenchactionexecuted |
| monacoworkbench/views.togglevisibility |
| monacoworkbench/views.welcomeaction |
| monacoworkbench/notification:show |
| monacoworkbench/notification:close |
| monacoworkbench/notification:hide |
| monacoworkbench/notification:actionexecuted |
| monacoworkbench/automaticlanguagedetection.likelywrong |
| monacoworkbench/workbencheditorreopen |
| monacoworkbench/activitybaraction |
| monacoworkbench/keybindingseditor.action |
| monacoworkbench/workspacetrustdisabled |
| monacoworkbench/workspacetrustfoldercounts |
| monacoworkbench/workspacetruststatechanged |
| monacoworkbench/workspacefolderdepthbelowtrustedfolder |
| monacoworkbench/experiments |
| monacoworkbench/webviewmissingcsp |
| monacoworkbench/searcheditor/savesearchresults |
| monacoworkbench/searcheditor/opennewsearcheditor |
| monacoworkbench/searcheditor/createeditorfromsearchresult |
| monacoworkbench/fileextensionsuggestion:popup |
| monacoworkbench/extensionworkspacerecommendations:open |
| monacoworkbench/extensionsrecommendations:ignorerecommendation |
| monacoworkbench/extensionrecommendations:popup |
| monacoworkbench/extensionworkspacerecommendations:popup |
| monacoworkbench/dynamicworkspacerecommendations |
| monacoworkbench/gettingstarted.didautoopenwalkthrough |
| monacoworkbench/gettingstarted.actionexecuted |
| monacoworkbench/windowsedition |
| monacoworkbench/sync/handleconflicts |
| monacoworkbench/sync/showconflicts |
| monacoworkbench/workspaceload |
| monacoworkbench/settingsread |
| monacoworkbench/fileget |
| monacoworkbench/settingswritten |
| monacoworkbench/fileput |
| monacoworkbench/notebook/editoropened |
| monacoworkbench/notebook/editoropenperf |
| monacoworkbench/startup.resource.perf |
| monacoworkbench/remotereconnectionreload |
| monacoworkbench/remoteconnectionlost |
| monacoworkbench/remotereconnectionrunning |
| monacoworkbench/remotereconnectionpermanentfailure |
| monacoworkbench/remoteconnectiongain |
| monacoworkbench/automaticlanguagedetection.stats |
| monacoworkbench/openkeybindings |
| monacoworkbench/startup.timer.mark |
| monacoworkbench/tasclientreadtreatmentcomplete |
| monacoworkbench/uri_invoked/start |
| monacoworkbench/uri_invoked/cancel |
| monacoworkbench/uri_invoked/end |
| monacoworkbench/uri_invoked/activate_extension/start |
| monacoworkbench/uri_invoked/activate_extension/cancel |
| monacoworkbench/uri_invoked/activate_extension/accept |
| monacoworkbench/uri_invoked/enable_extension/start |
| monacoworkbench/uri_invoked/enable_extension/cancel |
| monacoworkbench/uri_invoked/enable_extension/accept |
| monacoworkbench/uri_invoked/install_extension/start |
| monacoworkbench/uri_invoked/install_extension/cancel |
| monacoworkbench/uri_invoked/install_extension/accept |
| monacoworkbench/uri_invoked/install_extension/reload |
| monacoworkbench/extensionhostcrash |
| monacoworkbench/extensionhostcrashextension |
| monacoworkbench/extensionhoststartup |
| monacoworkbench/extensionsmessage |
| monacoworkbench/extensionactivationerror |
| monacoworkbench/cachedsearchcomplete |
| monacoworkbench/searchcomplete |
| monacoworkbench/textsearchcomplete |
| monacoworkbench/sync/firsttimesync |
| monacoworkbench/sync.useraccount |
| monacoworkbench/sync/successiveauthfailures |
| monacoworkbench/viewdescriptorservice.moveviews |
| monacoworkbench/accessibility |
| monacoworkbench/activateplugin |
| monacoworkbench/override.viewtype |
| monacoworkbench/remoteconnectionfailure |
| monacoworkbench/suggest.durations.json |
| monacoworkbench/suggest.acceptedsuggestion |
| monacoworkbench/codeaction.applycodeaction |
| monacoworkbench/update:notavailable |
| monacoworkbench/update:downloaded |
| monacoworkbench/sync/error |
| monacoworkbench/sync.enable |
| monacoworkbench/sync/turnoffeverywhere |
| monacoworkbench/autosync/error |
| monacoworkbench/sync/triggered |
| monacoworkbench/sync/conflictsdetected |
| monacoworkbench/sync/conflictsresolved |
| monacoworkbench/sync/incompatible |
| monacoworkbench/workspace.stats |
| monacoworkbench/workspace.stats.file |
| monacoworkbench/workspace.stats.launchconfigfile |
| monacoworkbench/workspace.stats.configfiles |
| monacoworkbench/updateconfiguration |
| monacoworkbench/windowerror |
| monacoworkbench/galleryservice:additionalquery |
| monacoworkbench/galleryservice:query |
| monacoworkbench/galleryservice:cdnfallback |
| monacoworkbench/exeextensionrecommendations:alreadyinstalled |
| monacoworkbench/exeextensionrecommendations:notinstalled |
| monacoworkbench/authentication.providerusage |
| monacoworkbench/api/scm/createsourcecontrol |
| monacoworkbench/shimming.keytar |
| monacoworkbench/shimming.open |
| monacoworkbench/shimming.open.call.noforward |
| monacoworkbench/extensionactivationtimes |
| monacoworkbench/exthostdeprecatedapiusage |
| monacoworkbench/sharedprocesserror |
| monacoworkbench/serverstart |
| monacoworkbench/startuplayout |
| monacoworkbench/editoractioninvoked |
| monacoworkbench/unhandlederror |
| websitetracking/newuserinstall |
| websitetracking/dbconnectionlog |
| websitetracking/download| 