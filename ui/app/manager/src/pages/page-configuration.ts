import { css, html, TemplateResult, unsafeCSS } from "lit";
import { customElement } from "lit/decorators.js";
import manager, { DefaultColor1, DefaultColor3 } from "@openremote/core";
import "@openremote/or-components/or-panel";
import "@openremote/or-translate";
import { Store } from "@reduxjs/toolkit";
import { AppStateKeyed, Page, PageProvider } from "@openremote/or-app";
import "@openremote/or-components/or-collapsible-panel";
import "@openremote/or-mwc-components/or-mwc-input";
import "@openremote/or-configuration/or-conf-json";
import "@openremote/or-configuration/or-conf-realm/index";
import { ManagerConf } from "@openremote/model";
import { i18next } from "@openremote/or-translate";
import { DialogAction, OrMwcDialog, showDialog } from "@openremote/or-mwc-components/or-mwc-dialog";

export function pageConfigurationProvider(store: Store<AppStateKeyed>): PageProvider<AppStateKeyed> {
    return {
        name: "configuration",
        routes: [
            "configuration",
        ],
        pageCreator: () => {
            return new PageConfiguration(store);
        }
    };
}

@customElement("page-configuration")
export class PageConfiguration extends Page<AppStateKeyed>  {

    static get styles() {
        // language=CSS
        return css`
            .main-content{
                display: unset!important;
            }

            :host {
                flex: 1;
                width: 100%;
                
                display: flex;
                justify-content: center;

                --or-collapisble-panel-background-color: #fff;
                --or-panel-background-color: #fff;
                --or-panel-padding: 18px 24px 24px;
                --or-panel-heading-margin: 0 0 14px 0;
                --or-panel-background-color: var(--or-app-color1, ${unsafeCSS(DefaultColor1)});
                --or-panel-heading-font-size: 14px; 
            }

            or-panel {
                width: calc(100% - 40px);
                max-width: 1360px;
                margin-bottom: 16px;
            }

            #wrapper {
                display: flex;
                min-width: 0px;
                width: 100%;
                height: 100%;
                flex-direction: column;
                align-items: center;
                overflow: auto;
            }

            #header-wrapper {
                display: flex;
                width: calc(100% - 40px);
                max-width: 1360px;
                padding: 0 20px;
                flex-direction: row;
                align-items: center;
                justify-content: space-between;
                margin: 15px auto;
            }

            #header-title {
                font-size: 18px;
                font-weight: bold;
                align-items: center;
                display: flex;
                color: var(--or-app-color3, ${unsafeCSS(DefaultColor3)});
            }

            #header-title > or-icon {
                margin-right: 10px;
                margin-left: 14px;
            }

            #header-actions or-mwc-input{
                margin-left: 12px;
            }

            or-icon {
                vertical-align: middle;
                --or-icon-width: 20px;
                --or-icon-height: 20px;
                margin-right: 2px;
                margin-left: -5px;
            }

            @media screen and (max-width: 768px) {
                or-panel {
                    border-left: 0px;
                    border-right: 0px;
                    width: 100%;
                    --or-panel-border-radius: 0;
                }
                #header-wrapper{
                    width: calc(100% - 30px);
                }
                .hide-mobile {
                    display: none;
                }
            }
        `;
    }

    get name(): string {
        return "configuration";
    }

    constructor(store: Store<AppStateKeyed>) {
        super(store);
    }

    protected firstUpdated(_changedProperties: Map<PropertyKey, unknown>): void {
        const app = this
        document.addEventListener('saveLocalManagerConfig', (e:CustomEvent) => {
            manager.managerAppConfig = e.detail?.value as ManagerConf
            app.requestUpdate()
        })

        document.addEventListener('saveManagerConfig', (e:CustomEvent) => {
            manager.rest.api.ConfigurationResource.update(e.detail?.value as ManagerConf).then(()=>{
                fetch("/manager_config.json", {cache:"reload"})
                manager.managerAppConfig = e.detail?.value as ManagerConf
                Object.entries(manager.managerAppConfig.realms).map(([name, settings]) => {
                    fetch(settings?.favicon, {cache:"reload"})
                    fetch(settings?.logo, {cache:"reload"})
                    fetch(settings?.logoMobile, {cache:"reload"})
                })
                app.requestUpdate()
            })
        })
    }

    protected render(): TemplateResult | void {

        if (!manager.authenticated) {
            return html`
                <or-translate value="notAuthenticated"></or-translate>
            `;
        }

        const managerConfiguration = manager.managerAppConfig

        return html`
            <div id="wrapper">
                <div id="header-wrapper">
                    <div id="header-title">
                        <or-icon icon="palette-outline"></or-icon>
                        ${i18next.t('appearance')}
                    </div>
                    <div id="header-actions">
                        <or-conf-json .managerConfig="${managerConfiguration}" class="hide-mobile"></or-conf-json>
                        <or-mwc-input id="save-btn" raised="" type="button" .label="${i18next.t('save')}" @click="${() => {
                            document.dispatchEvent(new CustomEvent("saveManagerConfig", { detail: { value: managerConfiguration } }));
                        }}"></or-mwc-input>
                    </div>
                </div>
                <or-panel .heading="${i18next.t('configuration.realmStyling')}">
                    <or-conf-realm .config="${managerConfiguration}"></or-conf-realm>
                </or-panel>
            </div>
        `;


    }

    public stateChanged(state: AppStateKeyed) {
    }
}
