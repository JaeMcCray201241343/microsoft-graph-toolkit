/**
 * -------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation.  All Rights Reserved.  Licensed under the MIT License.
 * See License in the project root for license information.
 * -------------------------------------------------------------------------------------------
 */

import { AuthenticationHandlerOptions, Middleware } from '@microsoft/microsoft-graph-client';
import { GraphEndpoint, MICROSOFT_GRAPH_ENDPOINTS, Providers } from '..';

/**
 * creates an AuthenticationHandlerOptions from scopes array that
 * can be used in the Graph sdk middleware chain
 *
 * @export
 * @param {...string[]} scopes
 * @returns
 */
export function prepScopes(...scopes: string[]) {
  const authProviderOptions = {
    scopes
  };

  if (!Providers.globalProvider.isIncrementalConsentDisabled) {
    return [new AuthenticationHandlerOptions(undefined, authProviderOptions)];
  } else {
    return [];
  }
}

/**
 * Helper method to chain Middleware when instantiating new Client
 *
 * @param {...Middleware[]} middleware
 * @returns {Middleware}
 */
export function chainMiddleware(...middleware: Middleware[]): Middleware {
  const rootMiddleware = middleware[0];
  let current = rootMiddleware;
  for (let i = 1; i < middleware.length; ++i) {
    const next = middleware[i];
    if (current.setNext) {
      current.setNext(next);
    }
    current = next;
  }
  return rootMiddleware;
}

/**
 * Helper method to validate a base URL string
 * @param url a URL string
 * @returns GraphEndpoint
 */
export function validateBaseURL(url: string): GraphEndpoint {
  try {
    const urlObj = new URL(url);
    if (MICROSOFT_GRAPH_ENDPOINTS.has(urlObj.href)) {
      return urlObj.href as GraphEndpoint;
    }
  } catch (error) {
    return;
  }
}
