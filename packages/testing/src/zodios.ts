import type {
  ZodiosPathsByMethod,
  ZodiosResponseByPath,
  ZodiosEndpointDefinitions,
  ZodiosRequestOptionsByPath,
  AnyZodiosTypeProvider,
  ZodTypeProvider,
  AnyZodiosFetcherProvider,
  ZodiosBase,
  ZodiosErrorsByPath,
  MockResponse,
} from "@zodios/core";
import type { ReadonlyDeep } from "@zodios/core/lib/utils.types";
import { zodiosMocks } from "@zodios/core";
/**
 * zodios mock service
 */
export class ZodiosMocks<
  Api extends ZodiosEndpointDefinitions,
  FetcherProvider extends AnyZodiosFetcherProvider,
  TypeProvider extends AnyZodiosTypeProvider = ZodTypeProvider
> {
  constructor(
    private readonly zodios: ZodiosBase<Api, FetcherProvider, TypeProvider>
  ) {}

  static install() {
    zodiosMocks.install();
  }

  static uninstall() {
    zodiosMocks.uninstall();
  }

  get<
    Path extends ZodiosPathsByMethod<Api, "get">,
    TConfig extends ZodiosRequestOptionsByPath<
      Api,
      "get",
      Path,
      FetcherProvider,
      true,
      TypeProvider
    >
  >(
    path: Path,
    callback: (
      config: ReadonlyDeep<TConfig>
    ) => Promise<
      MockResponse<
        | ZodiosResponseByPath<Api, "get", Path, false, TypeProvider>
        | ZodiosErrorsByPath<Api, "get", Path, false, TypeProvider>
      >
    >
  ) {
    zodiosMocks.mockRequest("get", path, callback as any);
  }

  post<
    Path extends ZodiosPathsByMethod<Api, "post">,
    TConfig extends ZodiosRequestOptionsByPath<
      Api,
      "post",
      Path,
      FetcherProvider,
      true,
      TypeProvider
    >
  >(
    path: Path,
    callback: (
      config: ReadonlyDeep<TConfig>
    ) => Promise<
      MockResponse<
        | ZodiosResponseByPath<Api, "post", Path, false, TypeProvider>
        | ZodiosErrorsByPath<Api, "post", Path, false, TypeProvider>
      >
    >
  ) {
    zodiosMocks.mockRequest("post", path, callback as any);
  }

  put<
    Path extends ZodiosPathsByMethod<Api, "put">,
    TConfig extends ZodiosRequestOptionsByPath<
      Api,
      "put",
      Path,
      FetcherProvider,
      true,
      TypeProvider
    >
  >(
    path: Path,
    callback: (
      config: ReadonlyDeep<TConfig>
    ) => Promise<
      MockResponse<
        | ZodiosResponseByPath<Api, "put", Path, false, TypeProvider>
        | ZodiosErrorsByPath<Api, "put", Path, false, TypeProvider>
      >
    >
  ) {
    zodiosMocks.mockRequest("put", path, callback as any);
  }

  patch<
    Path extends ZodiosPathsByMethod<Api, "patch">,
    TConfig extends ZodiosRequestOptionsByPath<
      Api,
      "patch",
      Path,
      FetcherProvider,
      true,
      TypeProvider
    >
  >(
    path: Path,
    callback: (
      config: ReadonlyDeep<TConfig>
    ) => Promise<
      MockResponse<
        | ZodiosResponseByPath<Api, "patch", Path, false, TypeProvider>
        | ZodiosErrorsByPath<Api, "patch", Path, false, TypeProvider>
      >
    >
  ) {
    zodiosMocks.mockRequest("patch", path, callback as any);
  }

  delete<
    Path extends ZodiosPathsByMethod<Api, "delete">,
    TConfig extends ZodiosRequestOptionsByPath<
      Api,
      "delete",
      Path,
      FetcherProvider,
      true,
      TypeProvider
    >
  >(
    path: Path,
    callback: (
      config: ReadonlyDeep<TConfig>
    ) => Promise<
      MockResponse<
        | ZodiosResponseByPath<Api, "delete", Path, false, TypeProvider>
        | ZodiosErrorsByPath<Api, "delete", Path, false, TypeProvider>
      >
    >
  ) {
    zodiosMocks.mockRequest("delete", path, callback as any);
  }
}