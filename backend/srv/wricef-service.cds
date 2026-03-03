// ─────────────────────────────────────────────────────────────────────────────
// WRICEF Objects Service Definition
// ─────────────────────────────────────────────────────────────────────────────
using { sap.performance as db } from '../db/schema';

service WricefService @(path: '/odata/v4/performance/wricef', impl: './impl/wricef.impl') {

  entity WricefObjects as projection on db.WricefObjects;
  entity WricefItems as projection on db.WricefItems;
  entity DocumentationObjects as projection on db.DocumentationObjects;
  entity DocumentationAttachments as projection on db.DocumentationAttachments;

  action uploadWricefExcel(projectId : String, base64File : LargeString) returns array of WricefObjects;
}
