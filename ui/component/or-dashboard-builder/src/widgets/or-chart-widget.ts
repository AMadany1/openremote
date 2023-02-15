import {Asset, AssetDatapointIntervalQuery, AssetDatapointIntervalQueryFormula, AssetDatapointLTTBQuery, AssetDatapointQueryUnion, Attribute, AttributeRef, DashboardWidget} from "@openremote/model";
import {InputType, OrInputChangedEvent} from "@openremote/or-mwc-components/or-mwc-input";
import {i18next} from "@openremote/or-translate";
import {html, LitElement, TemplateResult} from "lit";
import {customElement, property, state} from "lit/decorators.js";
import {when} from "lit/directives/when.js";
import {choose} from 'lit/directives/choose.js';
import {OrWidgetConfig, OrWidgetEntity} from "./or-base-widget";
import {SettingsPanelType, widgetSettingsStyling} from "../or-dashboard-settingspanel";
import {style} from "../style";
import manager from "@openremote/core";
import {showSnackbar} from "@openremote/or-mwc-components/or-mwc-snackbar";
import moment from "moment";


export interface ChartWidgetConfig extends OrWidgetConfig {
    displayName: string;
    attributeRefs: AttributeRef[];
    datapointQuery: AssetDatapointQueryUnion;
    showTimestampControls: boolean;
    showLegend: boolean;
}


export class OrChartWidget implements OrWidgetEntity {

    // Properties
    readonly DISPLAY_NAME: string = "Line Chart";
    readonly DISPLAY_MDI_ICON: string = "chart-bell-curve-cumulative"; // https://materialdesignicons.com;
    readonly MIN_COLUMN_WIDTH: number = 2;
    readonly MIN_PIXEL_WIDTH: number = 0;
    readonly MIN_PIXEL_HEIGHT: number = 0;

    getDefaultConfig(widget: DashboardWidget): ChartWidgetConfig {
        return {
            displayName: widget?.displayName,
            attributeRefs: [],
            datapointQuery: {
                type: "lttb",
                fromTimestamp: Date.now(),
                toTimestamp: Date.now(),
                amountOfPoints: 100
            },
            showTimestampControls: false,
            showLegend: true
        } as ChartWidgetConfig;
    }

    getWidgetHTML(widget: DashboardWidget, editMode: boolean, realm: string): TemplateResult {
        return html`<or-chart-widget .widget="${widget}" .editMode="${editMode}" .realm="${realm}" style="overflow: auto; height: 100%;"></or-chart-widget>`;
    }

    getSettingsHTML(widget: DashboardWidget, realm: string): TemplateResult {
        return html`<or-chart-widgetsettings .widget="${widget}" .realm="${realm}"></or-chart-widgetsettings>`;
    }

}




@customElement('or-chart-widget')
export class OrChartWidgetContent extends LitElement {

    @property()
    public readonly widget?: DashboardWidget;

    @property()
    public editMode?: boolean;

    @property()
    public realm?: string;

    @state()
    private assets: Asset[] = [];

    @state()
    private assetAttributes: [number, Attribute<any>][] = [];

    /* ---------- */

    render() {
        return html`
            <or-chart .assets="${this.assets}" .assetAttributes="${this.assetAttributes}" denseLegend="${true}" .realm="${this.realm}"
                      .showLegend="${(this.widget?.widgetConfig?.showLegend != null) ? this.widget?.widgetConfig?.showLegend : true}"
                      .attributeControls="${false}" .timestampControls="${this.widget?.widgetConfig?.showTimestampControls}" .algorithm="${this.widget?.widgetConfig?.algorithm}"
                      .datapointQuery="${this.widget?.widgetConfig?.datapointQuery}"
                      style="height: 100%"
            ></or-chart>
        `
    }

    willUpdate(changedProperties: Map<string, any>) {

        // Add datapointQuery if not set yet (due to migration)
        if(this.widget && this.widget.widgetConfig.datapointQuery == undefined) {
            this.widget.widgetConfig.datapointQuery = {
                type: "lttb",
                fromTimestamp: moment().set('minute', -60).toDate().getTime(),
                toTimestamp: moment().set('minute', 60).toDate().getTime(),
                amountOfPoints: 100
            };
            if(!changedProperties.has("widget")) {
                changedProperties.set("widget", this.widget);
            }
        }
        super.willUpdate(changedProperties);
    }

    updated(changedProperties: Map<string, any>) {

        // Fetch assets
        if(changedProperties.has("widget") || changedProperties.has("editMode")) {
            if(this.assetAttributes.length != this.widget!.widgetConfig.attributeRefs.length) {
                this.fetchAssets(this.widget?.widgetConfig).then((assets) => {
                    this.assets = assets!;
                    this.assetAttributes = this.widget?.widgetConfig.attributeRefs.map((attrRef: AttributeRef) => {
                        const assetIndex = assets!.findIndex((asset) => asset.id === attrRef.id);
                        const foundAsset = assetIndex >= 0 ? assets![assetIndex] : undefined;
                        return foundAsset && foundAsset.attributes ? [assetIndex, foundAsset.attributes[attrRef.name!]] : undefined;
                    }).filter((indexAndAttr: any) => !!indexAndAttr) as [number, Attribute<any>][];
                });
            }
        }
    }

    // Fetching the assets according to the AttributeRef[] input in DashboardWidget if required. TODO: Simplify this to only request data needed for attribute list
    async fetchAssets(config: OrWidgetConfig | any): Promise<Asset[] | undefined> {
        if(config.attributeRefs && config.attributeRefs.length > 0) {
            let assets: Asset[] = [];
            await manager.rest.api.AssetResource.queryAssets({
                ids: config.attributeRefs?.map((x: AttributeRef) => x.id) as string[],
                select: {
                    attributes: config.attributeRefs?.map((x: AttributeRef) => x.name) as string[]
                }
            }).then(response => {
                assets = response.data;
            }).catch((reason) => {
                console.error(reason);
                showSnackbar(undefined, i18next.t('errorOccurred'));
            });
            return assets;
        } else if(!config.attributeRefs) {
            console.error("Error: attributeRefs are not present in widget config!");
        }
    }


    /* --------------------------- */

    // Caching and generation of mockData, to prevent API call to be made.
    // Is currently not used anymore, but can be used with the dataProvider on or-chart.

    @state()
    private cachedMockData?: Map<string, { period: any, data: any[] }> = new Map<string, { period: any, data: any[] }>();

    generateMockData(widget: DashboardWidget, startOfPeriod: number, _endOfPeriod: number, amount: number = 10) {
        const mockTime: number = startOfPeriod;
        const chartData: any[] = [];
        const interval = (Date.now() - startOfPeriod) / amount;

        // Generating random coordinates on the chart
        let data: any[] = [];
        const cached: { period: any, data: any[] } | undefined = this.cachedMockData?.get(widget.id!);
        if(cached && (cached.data.length == widget.widgetConfig?.attributeRefs?.length) && (cached.period == widget.widgetConfig?.period)) {
            data = this.cachedMockData?.get(widget.id!)!.data!;
        } else {
            widget.widgetConfig?.attributeRefs?.forEach((_attrRef: AttributeRef) => {
                let valueEntries: any[] = [];
                let prevValue: number = 100;
                for(let i = 0; i < amount; i++) {
                    const value = Math.floor(Math.random() * ((prevValue + 2) - (prevValue - 2)) + (prevValue - 2))
                    valueEntries.push({
                        x: (mockTime + (i * interval)),
                        y: value
                    });
                    prevValue = value;
                }
                data.push(valueEntries);
            });
            this.cachedMockData?.set(widget.id!, { period: widget.widgetConfig?.period, data: data });
        }

        // Making a line for each attribute
        widget.widgetConfig?.attributeRefs?.forEach((attrRef: AttributeRef) => {
            chartData.push({
                backgroundColor: ["#3869B1", "#DA7E30", "#3F9852", "#CC2428", "#6B4C9A", "#922427", "#958C3D", "#535055"][chartData.length],
                borderColor: ["#3869B1", "#DA7E30", "#3F9852", "#CC2428", "#6B4C9A", "#922427", "#958C3D", "#535055"][chartData.length],
                data: data[chartData.length],
                fill: false,
                label: attrRef.name,
                pointRadius: 2
            });
        });
        return chartData;
    }
}







@customElement("or-chart-widgetsettings")
class OrChartWidgetSettings extends LitElement {

    @property()
    public widget?: DashboardWidget;

    // Default values
    private expandedPanels: string[] = [i18next.t('attributes'), i18next.t('algorithm'), i18next.t('display')];


    static get styles() {
        return [style, widgetSettingsStyling];
    }

    willUpdate(changedProperties: Map<string, any>) {

        // Add datapointQuery if not set yet (due to migration)
        if(this.widget && this.widget.widgetConfig.datapointQuery == undefined) {
            this.widget.widgetConfig.datapointQuery = {
                type: "lttb",
                fromTimestamp: moment().set('minute', -60).toDate().getTime(),
                toTimestamp: moment().set('minute', 60).toDate().getTime(),
                amountOfPoints: 100
            };
            if(!changedProperties.has("widget")) {
                changedProperties.set("widget", this.widget);
            }
        }
        super.willUpdate(changedProperties);
    }

    // UI Rendering
    render() {
        const config = JSON.parse(JSON.stringify(this.widget!.widgetConfig)) as ChartWidgetConfig; // duplicate to edit, to prevent parent updates. Please trigger updateConfig()
        return html`
            <div>
                ${this.generateExpandableHeader(i18next.t('attributes'))}
            </div>
            <div>
                ${this.expandedPanels.includes(i18next.t('attributes')) ? html`
                    <or-dashboard-settingspanel .type="${SettingsPanelType.MULTI_ATTRIBUTE}" .widgetConfig="${this.widget?.widgetConfig}"
                                                @updated="${(event: CustomEvent) => { this.updateConfig(this.widget!, event.detail.changes.get('config')) }}"
                    ></or-dashboard-settingspanel>
                ` : null}
            </div>
            <div>
                ${this.generateExpandableHeader(i18next.t('algorithm'))}
            </div>
            <div>
                ${this.expandedPanels.includes('algorithm') ? html`
                    ${when(config.datapointQuery, () => {
                        const typeOptions = new Map<string, string>([["Default", 'lttb'], ["With interval", 'interval']]);
                        const typeValue = Array.from(typeOptions.entries()).find((entry => entry[1] == config.datapointQuery.type))![0]
                        return html`
                            <div style="padding: 24px 24px 48px 24px;">
                                <or-mwc-input .type="${InputType.SELECT}" style="width: 100%" .options="${Array.from(typeOptions.keys())}"
                                              .value="${typeValue}" label="${i18next.t('algorithm')}" @or-mwc-input-changed="${(event: OrInputChangedEvent) => {
                                                  config.datapointQuery.type = typeOptions.get(event.detail.value)! as any;
                                                  this.updateConfig(this.widget!, config, true);
                                              }}"
                                ></or-mwc-input>
                                ${choose(config.datapointQuery.type, [
                                    ['interval', () => {
                                        const intervalQuery = config.datapointQuery as AssetDatapointIntervalQuery;
                                        const formulaOptions = [AssetDatapointIntervalQueryFormula.MIN, AssetDatapointIntervalQueryFormula.AVG, AssetDatapointIntervalQueryFormula.MAX];
                                        return html`
                                            <or-mwc-input .type="${InputType.SELECT}" style="width: 100%; margin-top: 18px;" .options="${formulaOptions}"
                                                          .value="${intervalQuery.formula}" label="${i18next.t('formula')}" @or-mwc-input-changed="${(event: OrInputChangedEvent) => {
                                                              intervalQuery.formula = event.detail.value;this.updateConfig(this.widget!, config, true);
                                                          }}"
                                            ></or-mwc-input>
                                        `;
                                    }]
                                ])}
                            </div>
                        `
                    }, () => {
                        console.error(config);
                        return html`${i18next.t('errorOccurred')}`;
                    })}
                ` : null}
            </div>
            <div>
                ${this.generateExpandableHeader(i18next.t('display'))}
            </div>
            <div>
                ${this.expandedPanels.includes(i18next.t('display')) ? html`
                    <div style="padding: 24px 24px 48px 24px;">
                        <div class="switchMwcInputContainer">
                            <span>${i18next.t('dashboard.showTimestampControls')}</span>
                            <or-mwc-input .type="${InputType.SWITCH}" style="width: 70px;"
                                          .value="${config.showTimestampControls}"
                                          @or-mwc-input-changed="${(event: OrInputChangedEvent) => {
                                              config.showTimestampControls = event.detail.value;
                                              this.updateConfig(this.widget!, config);
                                          }}"
                            ></or-mwc-input>
                        </div>
                        <div class="switchMwcInputContainer">
                            <span>${i18next.t('dashboard.showLegend')}</span>
                            <or-mwc-input .type="${InputType.SWITCH}" style="width: 70px;"
                                          .value="${config.showLegend}"
                                          @or-mwc-input-changed="${(event: OrInputChangedEvent) => {
                                              config.showLegend = event.detail.value;
                                              this.updateConfig(this.widget!, config);
                                          }}"
                            ></or-mwc-input>
                        </div>
                    </div>
                ` : null}
            </div>
        `
    }

    updateConfig(widget: DashboardWidget, config: OrWidgetConfig | any, force: boolean = false) {
        const oldWidget = JSON.parse(JSON.stringify(widget)) as DashboardWidget;

        if(config.datapointQuery) {
            switch (config.datapointQuery.type) {
                case 'lttb': {
                    const query = config.datapointQuery as AssetDatapointLTTBQuery;
                    if(!query.amountOfPoints) { query.amountOfPoints = 100; }
                    break;
                }
                case 'interval': {
                    const query = config.datapointQuery as AssetDatapointIntervalQuery;
                    if(!query.interval) { query.interval = "1 hour"; }
                    if(!query.gapFill) { query.gapFill = false; }
                    if(!query.formula) { query.formula = AssetDatapointIntervalQueryFormula.AVG; }
                }
            }
        }

        widget.widgetConfig = config;
        this.requestUpdate("widget", oldWidget);
        this.forceParentUpdate(new Map<string, any>([["widget", widget]]), force);
    }

    // Method to update the Grid. For example after changing a setting.
    forceParentUpdate(changes: Map<string, any>, force: boolean = false) {
        this.dispatchEvent(new CustomEvent('updated', {detail: {changes: changes, force: force}}));
    }

    generateExpandableHeader(name: string): TemplateResult {
        return html`
            <span class="expandableHeader panel-title" @click="${() => { this.expandPanel(name); }}">
                <or-icon icon="${this.expandedPanels.includes(name) ? 'chevron-down' : 'chevron-right'}"></or-icon>
                <span style="margin-left: 6px; height: 25px; line-height: 25px;">${name}</span>
            </span>
        `
    }
    expandPanel(panelName: string): void {
        if (this.expandedPanels.includes(panelName)) {
            const indexOf = this.expandedPanels.indexOf(panelName, 0);
            if (indexOf > -1) {
                this.expandedPanels.splice(indexOf, 1);
            }
        } else {
            this.expandedPanels.push(panelName);
        }
        this.requestUpdate();
    }
}
