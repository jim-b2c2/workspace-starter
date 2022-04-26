import {
    CLITemplate,
    type CLIDispatchedSearchResult,
    type CLIFilter,
    type CLISearchListenerResponse, type HomeSearchResponse,
    type HomeSearchResult
} from "@openfin/workspace";
import type { Integration, IntegrationManager, IntegrationModule } from "../../integrations-shapes";
import type { FactSetResponse, FactSetSettings, FactSetTemplateData } from "./shapes";
import { getTemplateAndData, getBusyTemplate } from "./templates";

/**
 * Implement the integration provider for FactSet.
 * See https://developer.factset.com/api-catalog/factset-search-answers#apiDocumentation
 */
export class FactSetForceIntegrationProvider implements IntegrationModule<FactSetSettings> {
    /**
     * Provider id.
     * @internal
     */
    private static readonly _PROVIDER_ID = "factset";

    /**
     * The key to use for a FactSet Answer result.
     * @internal
     */
    private static readonly _ANSWER_SEARCH_RESULT_KEY = "factset-answer";

    /**
     * The key to use for a FactSet busy result.
     * @internal
     */
    private static readonly _BUSY_SEARCH_RESULT_KEY = "factset-body";

    /**
    * The integration manager.
    * @internal
    */
    private _integrationManager: IntegrationManager | undefined;

    /**
     * The debounce timer;
     */
    private _debounceTimerId: NodeJS.Timeout | undefined;

    /**
     * Is there a request in progress.
     */
    private _queryInProgress: boolean;

    /**
     * Is there another query to try.
     */
    private _nextQuery: string | undefined;

    /**
     * Is there a nest response to go with the nextQuery.
     */
    private _nextResponse: CLISearchListenerResponse | undefined;

    /**
    * The module is being registered.
    * @param integrationManager The manager for the integration.
    * @param integration The integration details.
    * @returns Nothing.
    */
    public async register(integrationManager: IntegrationManager, integration: Integration<FactSetSettings>): Promise<void> {
        this._integrationManager = integrationManager;
        this._queryInProgress = false;
        console.log("Registering FactSet");
    }

    /**
     * The module is being deregistered.
     * @param integration The integration details.
     * @returns Nothing.
     */
    public async deregister(integration: Integration<FactSetSettings>): Promise<void> {
    }

    /**
     * Get a list of the static application entries.
     * @param integration The integration details.
     * @returns The list of application entries.
     */
    public async getAppSearchEntries(integration: Integration<FactSetSettings>): Promise<HomeSearchResult[]> {
        const results = [];

        return results;
    }

    /**
     * An entry has been selected.
     * @param integration The integration details.
     * @param result The dispatched result.
     * @param lastResponse The last response.
     * @returns True if the item was handled.
     */
    public async itemSelection(
        integration: Integration<FactSetSettings>,
        result: CLIDispatchedSearchResult,
        lastResponse: CLISearchListenerResponse
    ): Promise<boolean> {
        const data: { providerId: string } & FactSetTemplateData = result.data;

        if (data.providerId === FactSetForceIntegrationProvider._PROVIDER_ID && result.action.name.startsWith("open")) {
            const idx = Number.parseInt(result.action.name.slice(4), 10);
            if (!Number.isNaN(idx) && data?.applicationLinks && idx < data?.applicationLinks.length) {
                await this._integrationManager.openUrl(data?.applicationLinks[idx].webLink);
            }
        }
        return false;
    }

    /**
     * Get a list of search results based on the query and filters.
     * @param integration The integration details.
     * @param query The query to search for.
     * @param filters The filters to apply.
     * @param lastResponse The last search response used for updating existing results.
     * @returns The list of results and new filters.
     */
    public async getSearchResults(
        integration: Integration<FactSetSettings>,
        query: string,
        filters: CLIFilter[],
        lastResponse: CLISearchListenerResponse
    ): Promise<HomeSearchResponse> {
        const results = [];

        if (integration?.data?.proxyEndpoint) {
            const busyRequired = this.debounceRequest(integration, query, lastResponse);
            if (busyRequired) {
                results.push(this.getBusySearchResult(integration));
            }
        }

        return {
            results
        };
    }

    /**
     * Get the search result to display when we are busy searching.
     * @param integration The integration details.
     * @returns The busy search result entry.
     * @internal
     */
    private getBusySearchResult(
        integration: Integration<FactSetSettings>
    ): HomeSearchResult {
        return {
            key: FactSetForceIntegrationProvider._BUSY_SEARCH_RESULT_KEY,
            icon: integration?.icon,
            title: "FactSet Searching...",
            actions: [],
            data: {
                providerId: FactSetForceIntegrationProvider._PROVIDER_ID
            },
            template: CLITemplate.Custom,
            templateContent: {
                layout: getBusyTemplate("busyIcon"),
                data: {
                    busyIcon: integration.data?.iconMap.busy
                }
            }
        };
    }

    /**
     * Get a list of search results based on the query and filters.
     * @param integration The integration details.
     * @param query The query to search for.
     * @param lastResponse The last search response used for updating existing results.
     * @returns True if a busy entry is required.
     */
    private debounceRequest(integration: Integration<FactSetSettings>, query: string, lastResponse: CLISearchListenerResponse): boolean {
        let busyRequired = false;

        if (this._queryInProgress) {
            // If there is already a query in progress then store the query
            // for when it is finished, and then we perform that query.
            this._nextQuery = query;
            this._nextResponse = lastResponse;
            // Keep the busy entry even for the new query.
            busyRequired = true;
        } else if (this._debounceTimerId) {
            clearTimeout(this._debounceTimerId);
            this._debounceTimerId = undefined;
        } else {
            // Need minimum 2 words for search with each work at least 3 chars
            const queryParts = query.split(" ");
            if (queryParts.length >= 2 && queryParts[0].length >= 3 && queryParts[1].length >= 3) {
                busyRequired = true;
                this._queryInProgress = true;

                this._debounceTimerId = setTimeout(async () => {
                    try {
                        const response = await this.sendRequest(query, integration);
                        if (response) {
                            lastResponse.respond([response]);
                        }
                    } catch (err) {
                        console.error(err);
                    } finally {
                        this._debounceTimerId = undefined;
                        this._queryInProgress = false;

                        if (this._nextQuery) {
                            // There is another query to send so restart the flow
                            const nextQuery = this._nextQuery;
                            const nextResponse = this._nextResponse;
                            this._nextQuery = undefined;
                            this._nextResponse = undefined;
                            this.debounceRequest(integration, nextQuery, nextResponse);
                        } else {
                            // Revoke any remaining busy results.
                            lastResponse.revoke(FactSetForceIntegrationProvider._BUSY_SEARCH_RESULT_KEY);
                        }
                    }
                }, 300);
            }
        }

        return busyRequired;
    }

    /**
     * Send the request to the API proxy.
     * @param integration The integration details.
     * @param query The query to search for.
     * @returns The results if there was one.
     */
    private async sendRequest(query: string, integration: Integration<FactSetSettings>): Promise<HomeSearchResult | undefined> {
        const payload = {
            url: `%ENV-apiEndpoint%/search/answers/v1/data?query=${encodeURIComponent(query)}`,
            method: "get",
            headers: {
                Authorization: "Basic %ENV-authorization%"
            },
            providerId: FactSetForceIntegrationProvider._PROVIDER_ID
        };
        const res = await fetch(integration?.data?.proxyEndpoint, {
            method: "POST",
            body: JSON.stringify(payload),
            headers: {
                "Content-Type": "application/json"
            }
        });

        const json: FactSetResponse = await res.json();

        if (json.data && json.data.template !== "AnswerWithoutDataTemplate" && json.data.template !== "NoAnswerTemplate") {
            return {
                actions: [],
                title: json.data.templateData.headline,
                label: json.data.title,
                key: FactSetForceIntegrationProvider._ANSWER_SEARCH_RESULT_KEY,
                icon: integration.icon,
                data: {
                    providerId: FactSetForceIntegrationProvider._PROVIDER_ID,
                    ...json.data.templateData
                },
                template: CLITemplate.Custom,
                templateContent: getTemplateAndData(json.data.template, json.data.templateData)
            };
        } else if (json.errors) {
            console.error(json.errors);
        }
    }
}