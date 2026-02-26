// start.js — Bootstrap CDS from the backend directory
process.chdir(__dirname);
process.env.CDS_TYPESCRIPT = 'false';
require('@sap/cds').server(__dirname);
