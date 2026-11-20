import 'fake-indexeddb/auto'
import assert from 'node:assert/strict'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {IndexedDbHrRepository} from './src/infrastructure/db/indexedDb'
import {PayrollService} from './src/modules/payroll/payrollService'
import {createSeedBundle} from './src/fixtures/seed'
import {STORES,DB_NAME} from './src/infrastructure/db/config'
import {upgradeDatabaseStructure} from './src/infrastructure/db/migrations'
import {operationStores,dayPolicy,exceptionEmployeeIds,occupationCode,calendarSeed,dailyAccrual,complianceRules} from './src/modules/operations/operations'
import {correctedDemoDay} from './src/infrastructure/db/operationsUpgrade'
import {insuranceRules} from './src/modules/payroll/insuranceRules'
import {calculatePayrollEntry} from './src/modules/payroll/payrollRules'
import {simplifiedTax} from './src/modules/payroll/ntsTax'
import {precedingThreeMonths,retirementFromSources} from './src/modules/payroll/retirementCalculation'
import {InsuranceFilingPanel,WithholdingFilingPanel} from './src/modules/payroll/InsuranceFilingPanel'
Object.assign(globalThis,{React})
const seed=createSeedBundle();seed.persons[0].email='custom@fixture.invalid';seed.persons[0].mobile='USER-EDIT';seed.attendanceMonthlySummaries[0].manualEdited=true;seed.attendanceMonthlySummaries[0].confirmedAt='2026-10-01T00:00:00Z';seed.attendanceMonthlySummaries[0].workedHours=123;
const request=indexedDB.open(DB_NAME,6);request.onupgradeneeded=()=>{upgradeDatabaseStructure(request.result,request.transaction!,0);operationStores.forEach(k=>request.result.deleteObjectStore(k))};const db=await new Promise<IDBDatabase>((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)});const tx=db.transaction([...db.objectStoreNames],'readwrite');for(const [key,value]of Object.entries(seed)){if(!db.objectStoreNames.contains(key))continue;for(const row of Array.isArray(value)?value:[value])tx.objectStore(key).put(row)}tx.objectStore('meta').put({id:'schemaVersion',value:6});tx.objectStore('meta').put({id:'seedVersion',value:5});await new Promise<void>((resolve,reject)=>{tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)});db.close();
const repo=new IndexedDbHrRepository();await repo.initialize();const row=(await repo.exportDatabase()).data.persons.find(p=>p.id===seed.persons[0].id)!;console.log(JSON.stringify({before:seed.persons[0].email,after:row.email,expected:'custom@fixture.invalid',mobilePreserved:row.mobile==='USER-EDIT',schemaFrom:6,schemaTo:7,requestedV078MarkerBefore:false},null,2));
