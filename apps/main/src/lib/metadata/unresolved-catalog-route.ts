import { type Metadata } from "next";

/**
 * Metadata for a catalog route the public read cannot resolve. That route is
 * either missing or private to an organization, and neither may be indexed.
 * It stays independent of the viewer so metadata never reads the session.
 */
export const UNRESOLVED_CATALOG_ROUTE_METADATA: Metadata = {
  robots: { follow: false, index: false },
};
