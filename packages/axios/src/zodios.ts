import type {
  AnyZodiosRequestOptions,
  ZodiosRequestOptions,
  ZodiosBodyByPath,
  Method,
  ZodiosPathsByMethod,
  ZodiosResponseByPath,
  ZodiosOptions,
  ZodiosEndpointDefinitions,
  ZodiosRequestOptionsByPath,
  ZodiosAliases,
  ZodiosPlugin,
  Aliases,
} from "./zodios.types";
import {
  PluginId,
  ZodiosPlugins,
  zodValidationPlugin,
  formDataPlugin,
  formURLPlugin,
  headerPlugin,
} from "./plugins";
import type {
  Narrow,
  PickRequired,
  ReadonlyDeep,
  RequiredKeys,
  UndefinedIfNever,
} from "./utils.types";
import { checkApi } from "./api";
import type { AnyZodiosTypeProvider, ZodTypeProvider } from "./type-providers";
import { zodTypeProvider } from "./type-providers";
import {
  AnyZodiosFetcherProvider,
  axiosProvider,
  AxiosProvider,
  fetchProvider,
  TypeOfFetcherOptions,
} from "./fetcher-providers";

interface ZodiosBase<
  Api extends ZodiosEndpointDefinitions,
  FetcherProvider extends AnyZodiosFetcherProvider,
  TypeProvider extends AnyZodiosTypeProvider
> {
  readonly api: Api;
  readonly _typeProvider: TypeProvider;
  readonly _fetcherProvider: FetcherProvider;
}

/**
 * zodios api client based on axios
 */
export class ZodiosClass<
  Api extends ZodiosEndpointDefinitions,
  TypeProvider extends AnyZodiosTypeProvider = ZodTypeProvider,
  FetcherProvider extends AnyZodiosFetcherProvider = AxiosProvider
> implements ZodiosBase<Api, FetcherProvider, TypeProvider>
{
  public readonly options: PickRequired<
    ZodiosOptions<FetcherProvider, TypeProvider>,
    | "validate"
    | "transform"
    | "sendDefaults"
    | "typeProvider"
    | "fetcherProvider"
  >;
  public readonly api: Api;
  public readonly _typeProvider: TypeProvider;
  public readonly _fetcherProvider: FetcherProvider;
  private endpointPlugins: Map<string, ZodiosPlugins<FetcherProvider>> =
    new Map();

  /**
   * constructor
   * @param baseURL - the base url to use - if omited will use the browser domain
   * @param api - the description of all the api endpoints
   * @param options - the options to setup the client API
   * @example
   *   const apiClient = new Zodios("https://jsonplaceholder.typicode.com", [
   *     {
   *       method: "get",
   *       path: "/users",
   *       description: "Get all users",
   *       parameters: [
   *         {
   *           name: "q",
   *           type: "Query",
   *           schema: z.string(),
   *         },
   *         {
   *           name: "page",
   *           type: "Query",
   *           schema: z.string().optional(),
   *         },
   *       ],
   *       response: z.array(z.object({ id: z.number(), name: z.string() })),
   *     }
   *   ]);
   */
  constructor(
    api: Narrow<Api>,
    options?: ZodiosOptions<FetcherProvider, TypeProvider> &
      TypeOfFetcherOptions<FetcherProvider>
  );
  constructor(
    baseUrl: string,
    api: Narrow<Api>,
    options?: ZodiosOptions<FetcherProvider, TypeProvider> &
      TypeOfFetcherOptions<FetcherProvider>
  );
  constructor(
    arg1?: Api | string,
    arg2?:
      | Api
      | (ZodiosOptions<FetcherProvider, TypeProvider> &
          TypeOfFetcherOptions<FetcherProvider>),
    arg3?: ZodiosOptions<FetcherProvider, TypeProvider> &
      TypeOfFetcherOptions<FetcherProvider>
  ) {
    let options: ZodiosOptions<FetcherProvider, TypeProvider> &
      TypeOfFetcherOptions<FetcherProvider>;
    if (!arg1) {
      if (Array.isArray(arg2)) {
        throw new Error("Zodios: missing base url");
      }
      throw new Error("Zodios: missing api description");
    }
    let baseURL: string | undefined;
    if (typeof arg1 === "string" && Array.isArray(arg2)) {
      baseURL = arg1;
      this.api = arg2;
      options = arg3 || {};
    } else if (Array.isArray(arg1) && !Array.isArray(arg2)) {
      this.api = arg1;
      options = arg2 || {};
    } else {
      throw new Error("Zodios: api must be an array");
    }

    checkApi(this.api);

    this.options = {
      validate: true,
      transform: true,
      sendDefaults: false,
      typeProvider: zodTypeProvider as any,
      fetcherProvider: axiosProvider,
      ...options,
    };
    this._typeProvider = undefined as any;
    this._fetcherProvider = undefined as any;
    this.options.fetcherProvider.create({ baseURL, ...this.options });

    this.injectAliasEndpoints();
    this.initPlugins();
    if ([true, "all", "request", "response"].includes(this.options.validate)) {
      this.use(zodValidationPlugin(this.options));
    }
  }

  private initPlugins() {
    this.endpointPlugins.set("any-any", new ZodiosPlugins("any", "any"));

    this.api.forEach((endpoint) => {
      const plugins = new ZodiosPlugins<FetcherProvider>(
        endpoint.method,
        endpoint.path
      );
      switch (endpoint.requestFormat) {
        case "binary":
          plugins.use(
            headerPlugin<FetcherProvider>(
              "Content-Type",
              "application/octet-stream"
            )
          );
          break;
        case "form-data":
          plugins.use(formDataPlugin<FetcherProvider>());
          break;
        case "form-url":
          plugins.use(formURLPlugin<FetcherProvider>());
          break;
        case "text":
          plugins.use(
            headerPlugin<FetcherProvider>("Content-Type", "text/plain")
          );
          break;
      }
      this.endpointPlugins.set(`${endpoint.method}-${endpoint.path}`, plugins);
    });
  }

  private getAnyEndpointPlugins() {
    return this.endpointPlugins.get("any-any");
  }

  private findAliasEndpointPlugins(alias: string) {
    const endpoint = this.api.find((endpoint) => endpoint.alias === alias);
    if (endpoint) {
      return this.endpointPlugins.get(`${endpoint.method}-${endpoint.path}`);
    }
    return undefined;
  }

  private findEnpointPlugins(method: Method, path: string) {
    return this.endpointPlugins.get(`${method}-${path}`);
  }

  /**
   * register a plugin to intercept the requests or responses
   * @param plugin - the plugin to use
   * @returns an id to allow you to unregister the plugin
   */
  use(plugin: ZodiosPlugin<FetcherProvider>): PluginId;
  use<Alias extends Aliases<Api>>(
    alias: Alias,
    plugin: ZodiosPlugin<FetcherProvider>
  ): PluginId;
  use<M extends Method, Path extends ZodiosPathsByMethod<Api, M>>(
    method: M,
    path: Path,
    plugin: ZodiosPlugin<FetcherProvider>
  ): PluginId;
  use(...args: unknown[]) {
    if (typeof args[0] === "object") {
      const plugins = this.getAnyEndpointPlugins()!;
      return plugins.use(args[0] as ZodiosPlugin<FetcherProvider>);
    } else if (typeof args[0] === "string" && typeof args[1] === "object") {
      const plugins = this.findAliasEndpointPlugins(args[0]);
      if (!plugins)
        throw new Error(
          `Zodios: no alias '${args[0]}' found to register plugin`
        );
      return plugins.use(args[1] as ZodiosPlugin<FetcherProvider>);
    } else if (
      typeof args[0] === "string" &&
      typeof args[1] === "string" &&
      typeof args[2] === "object"
    ) {
      const plugins = this.findEnpointPlugins(args[0] as Method, args[1]);
      if (!plugins)
        throw new Error(
          `Zodios: no endpoint '${args[0]} ${args[1]}' found to register plugin`
        );
      return plugins.use(args[2] as ZodiosPlugin<FetcherProvider>);
    }
    throw new Error("Zodios: invalid plugin registration");
  }

  /**
   * unregister a plugin
   * if the plugin name is provided instead of the registration plugin id,
   * it will unregister the plugin with that name only for non endpoint plugins
   * @param plugin - id of the plugin to remove
   */
  eject(plugin: PluginId | string): void {
    if (typeof plugin === "string") {
      const plugins = this.getAnyEndpointPlugins()!;
      plugins.eject(plugin);
      return;
    }
    this.endpointPlugins.get(plugin.key)?.eject(plugin);
  }

  private injectAliasEndpoints() {
    this.api.forEach((endpoint) => {
      if (endpoint.alias) {
        (this as any)[endpoint.alias] = (config: any) =>
          this.request({
            ...config,
            method: endpoint.method,
            url: endpoint.path,
          });
      }
    });
  }

  /**
   * make a request to the api
   * @param config - the config to setup zodios options and parameters
   * @returns response validated with zod schema provided in the api description
   */
  async request<
    M extends Method,
    Path extends ZodiosPathsByMethod<Api, M>,
    TConfig = ReadonlyDeep<
      ZodiosRequestOptions<Api, M, Path, true, TypeProvider, FetcherProvider>
    >
  >(
    config: TConfig
  ): Promise<ZodiosResponseByPath<Api, M, Path, true, TypeProvider>> {
    let conf = config as unknown as ReadonlyDeep<
      AnyZodiosRequestOptions<FetcherProvider>
    >;
    const anyPlugin = this.getAnyEndpointPlugins()!;
    const endpointPlugin = this.findEnpointPlugins(conf.method, conf.url);
    conf = await anyPlugin.interceptRequest(this.api, conf);
    if (endpointPlugin) {
      conf = await endpointPlugin.interceptRequest(this.api, conf);
    }
    let response = this.options.fetcherProvider.fetch(conf);
    if (endpointPlugin) {
      response = endpointPlugin.interceptResponse(this.api, conf, response);
    }
    response = anyPlugin.interceptResponse(this.api, conf, response);
    return (await response).data;
  }

  /**
   * make a get request to the api
   * @param path - the path to api endpoint
   * @param config - the config to setup axios options and parameters
   * @returns response validated with zod schema provided in the api description
   */
  async get<
    Path extends ZodiosPathsByMethod<Api, "get">,
    TConfig extends ZodiosRequestOptionsByPath<
      Api,
      "get",
      Path,
      true,
      TypeProvider,
      FetcherProvider
    >
  >(
    path: Path,
    ...[config]: RequiredKeys<TConfig> extends never
      ? [config?: ReadonlyDeep<TConfig>]
      : [config: ReadonlyDeep<TConfig>]
  ): Promise<ZodiosResponseByPath<Api, "get", Path, true, TypeProvider>> {
    return this.request({
      ...config,
      method: "get",
      url: path,
    });
  }

  /**
   * make a post request to the api
   * @param path - the path to api endpoint
   * @param data - the data to send
   * @param config - the config to setup axios options and parameters
   * @returns response validated with zod schema provided in the api description
   */
  async post<
    Path extends ZodiosPathsByMethod<Api, "post">,
    TConfig extends ZodiosRequestOptionsByPath<
      Api,
      "post",
      Path,
      true,
      TypeProvider,
      FetcherProvider
    >
  >(
    path: Path,
    ...[config]: RequiredKeys<TConfig> extends never
      ? [config?: ReadonlyDeep<TConfig>]
      : [config: ReadonlyDeep<TConfig>]
  ): Promise<ZodiosResponseByPath<Api, "post", Path, true, TypeProvider>> {
    return this.request({
      ...config,
      method: "post",
      url: path,
    });
  }

  /**
   * make a put request to the api
   * @param path - the path to api endpoint
   * @param data - the data to send
   * @param config - the config to setup axios options and parameters
   * @returns response validated with zod schema provided in the api description
   */
  async put<
    Path extends ZodiosPathsByMethod<Api, "put">,
    TConfig extends ZodiosRequestOptionsByPath<
      Api,
      "put",
      Path,
      true,
      TypeProvider,
      FetcherProvider
    >
  >(
    path: Path,
    ...[config]: RequiredKeys<TConfig> extends never
      ? [config?: ReadonlyDeep<TConfig>]
      : [config: ReadonlyDeep<TConfig>]
  ): Promise<ZodiosResponseByPath<Api, "put", Path, true, TypeProvider>> {
    return this.request({
      ...config,
      method: "put",
      url: path,
    });
  }

  /**
   * make a patch request to the api
   * @param path - the path to api endpoint
   * @param data - the data to send
   * @param config - the config to setup axios options and parameters
   * @returns response validated with zod schema provided in the api description
   */
  async patch<
    Path extends ZodiosPathsByMethod<Api, "patch">,
    TConfig extends ZodiosRequestOptionsByPath<
      Api,
      "patch",
      Path,
      true,
      TypeProvider,
      FetcherProvider
    >
  >(
    path: Path,
    ...[config]: RequiredKeys<TConfig> extends never
      ? [config?: ReadonlyDeep<TConfig>]
      : [config: ReadonlyDeep<TConfig>]
  ): Promise<ZodiosResponseByPath<Api, "patch", Path, true, TypeProvider>> {
    return this.request({
      ...config,
      method: "patch",
      url: path,
    });
  }

  /**
   * make a delete request to the api
   * @param path - the path to api endpoint
   * @param config - the config to setup axios options and parameters
   * @returns response validated with zod schema provided in the api description
   */
  async delete<
    Path extends ZodiosPathsByMethod<Api, "delete">,
    TConfig extends ZodiosRequestOptionsByPath<
      Api,
      "delete",
      Path,
      true,
      TypeProvider,
      FetcherProvider
    >
  >(
    path: Path,
    ...[config]: RequiredKeys<TConfig> extends never
      ? [config?: ReadonlyDeep<TConfig>]
      : [config: ReadonlyDeep<TConfig>]
  ): Promise<ZodiosResponseByPath<Api, "delete", Path, true, TypeProvider>> {
    return this.request({
      ...config,
      method: "delete",
      url: path,
    });
  }
}

export type ZodiosInstance<
  Api extends ZodiosEndpointDefinitions,
  TypeProvider extends AnyZodiosTypeProvider = ZodTypeProvider,
  FetcherProvider extends AnyZodiosFetcherProvider = AxiosProvider
> = ZodiosClass<Api, TypeProvider, FetcherProvider> &
  ZodiosAliases<Api, true, TypeProvider, FetcherProvider>;

export type ZodiosConstructor = {
  new <
    Api extends ZodiosEndpointDefinitions,
    TypeProvider extends AnyZodiosTypeProvider = ZodTypeProvider,
    FetcherProvider extends AnyZodiosFetcherProvider = AxiosProvider
  >(
    api: Narrow<Api>,
    options?: ZodiosOptions<FetcherProvider, TypeProvider> &
      TypeOfFetcherOptions<FetcherProvider>
  ): ZodiosInstance<Api, TypeProvider, FetcherProvider>;
  new <
    Api extends ZodiosEndpointDefinitions,
    TypeProvider extends AnyZodiosTypeProvider = ZodTypeProvider,
    FetcherProvider extends AnyZodiosFetcherProvider = AxiosProvider
  >(
    baseUrl: string,
    api: Narrow<Api>,
    options?: ZodiosOptions<FetcherProvider, TypeProvider> &
      TypeOfFetcherOptions<FetcherProvider>
  ): ZodiosInstance<Api, TypeProvider, FetcherProvider>;
};

export const Zodios = ZodiosClass as ZodiosConstructor;

/**
 * Get the Api description type from zodios
 * @param Z - zodios type
 */
export type ApiOf<Z extends ZodiosBase<any, any, any>> = Z["api"];
/**
 * Get the type provider type from zodios
 * @param Z - zodios type
 */
export type TypeProviderOf<Z extends ZodiosBase<any, any, any>> =
  Z["_typeProvider"];

export type FetcherProviderOf<Z extends ZodiosBase<any, any, any>> =
  Z["_fetcherProvider"];
