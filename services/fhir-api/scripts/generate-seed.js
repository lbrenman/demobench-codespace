#!/usr/bin/env node
/**
 * FHIR R4 Rich Seed Generator
 * Generates realistic, cross-referenced test data across all 15 resource types.
 * Run: node scripts/generate-seed.js
 * Then: npm run seed:clear  (to wipe and reload)
 *
 * Relationship map:
 *   Patient ← Observation, Condition, Encounter, MedicationRequest,
 *              AllergyIntolerance, Procedure, DiagnosticReport,
 *              Appointment, Immunization, CarePlan
 *   Encounter ← Observation, Condition (encounter-diagnosis),
 *                Procedure, DiagnosticReport
 *   Condition ← CarePlan.addresses
 *   Medication ← MedicationRequest
 *   Practitioner ← Encounter.participant, MedicationRequest.requester,
 *                   Procedure.performer, Appointment.participant,
 *                   CarePlan.author
 *   Organization ← Encounter.serviceProvider, Location.managingOrganization
 *   Location ← Encounter.location
 */

const fs   = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '../src/data');

// ─── HELPERS ────────────────────────────────────────────────────────────────
let _seq = 1;
function id(prefix) { return `${prefix}-${String(_seq++).padStart(3,'0')}`; }
function pick(arr)  { return arr[Math.floor(Math.random() * arr.length)]; }
function pickN(arr, n) {
  const copy = [...arr]; const out = [];
  for(let i=0;i<n&&copy.length;i++) out.push(...copy.splice(Math.floor(Math.random()*copy.length),1));
  return out;
}
function isoDate(y,m,d) { return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`; }
function randDate(startY, endY) {
  const y = startY + Math.floor(Math.random()*(endY-startY+1));
  const m = 1  + Math.floor(Math.random()*12);
  const d = 1  + Math.floor(Math.random()*28);
  return isoDate(y,m,d);
}
function randDT(startY, endY) { return randDate(startY,endY) + 'T' + String(8+Math.floor(Math.random()*10)).padStart(2,'0') + ':' + pick(['00','15','30','45']) + ':00Z'; }
function metaNow() { return { versionId:'1', lastUpdated: new Date().toISOString() }; }
function coding(system, code, display) { return { system, code, display }; }
function ref(type, rid, display) {
  const r = { reference:`${type}/${rid}` };
  if(display) r.display = display;
  return r;
}

// ─── ORGANIZATIONS (2) ──────────────────────────────────────────────────────
const orgs = [
  { resourceType:'Organization', id:'org-001', active:true, name:'Springfield General Hospital',
    type:[{coding:[coding('http://terminology.hl7.org/CodeSystem/organization-type','prov','Healthcare Provider')]}],
    telecom:[{system:'phone',value:'555-100-0000',use:'work'}],
    address:[{use:'work',line:['1 Hospital Drive'],city:'Springfield',state:'IL',postalCode:'62701',country:'US'}],
    identifier:[{system:'http://hl7.org/fhir/sid/us-npi',value:'1111111111'}], meta:metaNow() },
  { resourceType:'Organization', id:'org-002', active:true, name:'Shelbyville Medical Center',
    type:[{coding:[coding('http://terminology.hl7.org/CodeSystem/organization-type','prov','Healthcare Provider')]}],
    telecom:[{system:'phone',value:'555-200-0000',use:'work'}],
    address:[{use:'work',line:['42 Health Ave'],city:'Shelbyville',state:'IL',postalCode:'62565',country:'US'}],
    identifier:[{system:'http://hl7.org/fhir/sid/us-npi',value:'2222222222'}], meta:metaNow() },
];

// ─── LOCATIONS (4) ──────────────────────────────────────────────────────────
const locations = [
  { resourceType:'Location', id:'loc-001', status:'active', name:'SGH - Main Building',
    type:[{coding:[coding('http://terminology.hl7.org/CodeSystem/v3-RoleCode','HOSP','Hospital')]}],
    telecom:[{system:'phone',value:'555-100-0001'}],
    address:{line:['1 Hospital Drive'],city:'Springfield',state:'IL',postalCode:'62701'},
    managingOrganization:ref('Organization','org-001'), meta:metaNow() },
  { resourceType:'Location', id:'loc-002', status:'active', name:'SGH - Outpatient Clinic',
    type:[{coding:[coding('http://terminology.hl7.org/CodeSystem/v3-RoleCode','OF','Outpatient Facility')]}],
    address:{line:['2 Medical Plaza, Suite 100'],city:'Springfield',state:'IL',postalCode:'62701'},
    managingOrganization:ref('Organization','org-001'), partOf:ref('Location','loc-001'), meta:metaNow() },
  { resourceType:'Location', id:'loc-003', status:'active', name:'SGH - Emergency Department',
    type:[{coding:[coding('http://terminology.hl7.org/CodeSystem/v3-RoleCode','ER','Emergency')]}],
    address:{line:['1 Hospital Drive, ER Entrance'],city:'Springfield',state:'IL',postalCode:'62701'},
    managingOrganization:ref('Organization','org-001'), partOf:ref('Location','loc-001'), meta:metaNow() },
  { resourceType:'Location', id:'loc-004', status:'active', name:'Shelbyville Med - Main',
    type:[{coding:[coding('http://terminology.hl7.org/CodeSystem/v3-RoleCode','HOSP','Hospital')]}],
    address:{line:['42 Health Ave'],city:'Shelbyville',state:'IL',postalCode:'62565'},
    managingOrganization:ref('Organization','org-002'), meta:metaNow() },
];

// ─── PRACTITIONERS (5) ──────────────────────────────────────────────────────
const pracData = [
  { id:'prac-001', family:'Lee',       given:'Sarah',   prefix:'Dr.', gender:'female', npi:'1234567890', qual:'MD', specialty:'Internal Medicine' },
  { id:'prac-002', family:'Nguyen',    given:'James',   prefix:'Dr.', gender:'male',   npi:'0987654321', qual:'MD', specialty:'Surgery' },
  { id:'prac-003', family:'Okafor',    given:'Adaeze',  prefix:'Dr.', gender:'female', npi:'1122334455', qual:'MD', specialty:'Cardiology' },
  { id:'prac-004', family:'Martinez',  given:'Carlos',  prefix:'Dr.', gender:'male',   npi:'5566778899', qual:'MD', specialty:'Endocrinology' },
  { id:'prac-005', family:'Chen',      given:'Mei',     prefix:'',    gender:'female', npi:'9988776655', qual:'RN', specialty:'Nursing' },
];
const practitioners = pracData.map(p => ({
  resourceType:'Practitioner', id:p.id, active:true,
  name:[{use:'official',family:p.family,given:[p.given],prefix:p.prefix?[p.prefix]:[]}],
  gender:p.gender,
  telecom:[{system:'phone',value:'555-100-'+p.npi.slice(-4),use:'work'}],
  identifier:[{system:'http://hl7.org/fhir/sid/us-npi',value:p.npi}],
  qualification:[{code:{coding:[coding('http://terminology.hl7.org/CodeSystem/v2-0360',p.qual,p.qual)]}}],
  meta:metaNow()
}));
function pracName(pid) {
  const p = pracData.find(x=>x.id===pid);
  return p ? `${p.prefix} ${p.given} ${p.family}`.trim() : pid;
}

// ─── MEDICATIONS (catalog of 12) ────────────────────────────────────────────
const medCatalog = [
  { id:'med-001', name:'Metformin 500mg Tablet',    rxnorm:'860975',  form:'Tablet',   strength:'500 mg' },
  { id:'med-002', name:'Lisinopril 10mg Tablet',    rxnorm:'308460',  form:'Tablet',   strength:'10 mg' },
  { id:'med-003', name:'Atorvastatin 40mg Tablet',  rxnorm:'617310',  form:'Tablet',   strength:'40 mg' },
  { id:'med-004', name:'Amlodipine 5mg Tablet',     rxnorm:'197361',  form:'Tablet',   strength:'5 mg' },
  { id:'med-005', name:'Omeprazole 20mg Capsule',   rxnorm:'40790',   form:'Capsule',  strength:'20 mg' },
  { id:'med-006', name:'Levothyroxine 50mcg Tablet',rxnorm:'966221',  form:'Tablet',   strength:'50 mcg' },
  { id:'med-007', name:'Sertraline 50mg Tablet',    rxnorm:'312036',  form:'Tablet',   strength:'50 mg' },
  { id:'med-008', name:'Albuterol 90mcg Inhaler',   rxnorm:'745679',  form:'Inhaler',  strength:'90 mcg' },
  { id:'med-009', name:'Warfarin 5mg Tablet',       rxnorm:'855332',  form:'Tablet',   strength:'5 mg' },
  { id:'med-010', name:'Furosemide 40mg Tablet',    rxnorm:'313988',  form:'Tablet',   strength:'40 mg' },
  { id:'med-011', name:'Prednisone 10mg Tablet',    rxnorm:'312615',  form:'Tablet',   strength:'10 mg' },
  { id:'med-012', name:'Insulin Glargine 100u/mL',  rxnorm:'274783',  form:'Injection',strength:'100 units/mL' },
];
const medications = medCatalog.map(m => ({
  resourceType:'Medication', id:m.id, status:'active',
  code:{coding:[coding('http://www.nlm.nih.gov/research/umls/rxnorm',m.rxnorm,m.name)],text:m.name},
  form:{coding:[coding('http://snomed.info/sct','',m.form)]},
  meta:metaNow()
}));

// ─── PATIENT PERSONAS (20) ──────────────────────────────────────────────────
const patientPersonas = [
  { id:'pat-001', family:'Smith',     given:'John',      gender:'male',   dob:'1975-04-12', conditions:['hypertension','hyperlipidemia'],       meds:['med-002','med-003'], primaryPrac:'prac-001', org:'org-001' },
  { id:'pat-002', family:'Johnson',   given:'Maria',     gender:'female', dob:'1988-09-22', conditions:['type2diabetes','obesity'],              meds:['med-001','med-012'], primaryPrac:'prac-004', org:'org-001' },
  { id:'pat-003', family:'Williams',  given:'Robert',    gender:'male',   dob:'1962-11-05', conditions:['coronaryArteryDisease','heartFailure'], meds:['med-002','med-003','med-009','med-010'], primaryPrac:'prac-003', org:'org-001' },
  { id:'pat-004', family:'Brown',     given:'Emily',     gender:'female', dob:'1995-07-18', conditions:['asthma'],                              meds:['med-008'], primaryPrac:'prac-001', org:'org-001' },
  { id:'pat-005', family:'Davis',     given:'Charles',   gender:'male',   dob:'1958-03-30', conditions:['hypertension','type2diabetes','ckd'],   meds:['med-001','med-002','med-010'], primaryPrac:'prac-004', org:'org-002' },
  { id:'pat-006', family:'Garcia',    given:'Isabella',  gender:'female', dob:'1992-12-01', conditions:['hypothyroidism','depression'],          meds:['med-006','med-007'], primaryPrac:'prac-001', org:'org-001' },
  { id:'pat-007', family:'Miller',    given:'James',     gender:'male',   dob:'1969-06-14', conditions:['hypertension','hyperlipidemia','gerd'],  meds:['med-002','med-003','med-005'], primaryPrac:'prac-001', org:'org-001' },
  { id:'pat-008', family:'Wilson',    given:'Sophia',    gender:'female', dob:'1983-02-28', conditions:['rheumatoidArthritis'],                   meds:['med-011'], primaryPrac:'prac-001', org:'org-002' },
  { id:'pat-009', family:'Moore',     given:'David',     gender:'male',   dob:'1947-08-10', conditions:['coronaryArteryDisease','hypertension','type2diabetes'], meds:['med-002','med-003','med-001','med-009'], primaryPrac:'prac-003', org:'org-001' },
  { id:'pat-010', family:'Taylor',    given:'Olivia',    gender:'female', dob:'1971-05-25', conditions:['breastCancer'],                         meds:['med-005'], primaryPrac:'prac-002', org:'org-001' },
  { id:'pat-011', family:'Anderson',  given:'William',   gender:'male',   dob:'1985-10-03', conditions:['depression','anxiety'],                  meds:['med-007'], primaryPrac:'prac-001', org:'org-002' },
  { id:'pat-012', family:'Thomas',    given:'Ava',       gender:'female', dob:'1999-01-17', conditions:['asthma','allergicRhinitis'],             meds:['med-008'], primaryPrac:'prac-001', org:'org-001' },
  { id:'pat-013', family:'Jackson',   given:'Richard',   gender:'male',   dob:'1953-07-22', conditions:['heartFailure','atrialFibrillation'],     meds:['med-009','med-010','med-004'], primaryPrac:'prac-003', org:'org-001' },
  { id:'pat-014', family:'White',     given:'Mia',       gender:'female', dob:'2003-03-08', conditions:[],                                        meds:[], primaryPrac:'prac-001', org:'org-001' },
  { id:'pat-015', family:'Harris',    given:'Joseph',    gender:'male',   dob:'1966-11-30', conditions:['hypertension','hyperlipidemia'],         meds:['med-002','med-003'], primaryPrac:'prac-001', org:'org-002' },
  { id:'pat-016', family:'Martinez',  given:'Sofia',     gender:'female', dob:'1978-04-19', conditions:['type2diabetes','hypertension'],          meds:['med-001','med-002','med-004'], primaryPrac:'prac-004', org:'org-001' },
  { id:'pat-017', family:'Robinson',  given:'Thomas',    gender:'male',   dob:'1990-08-05', conditions:['gerd'],                                  meds:['med-005'], primaryPrac:'prac-001', org:'org-001' },
  { id:'pat-018', family:'Clark',     given:'Charlotte', gender:'female', dob:'1945-12-25', conditions:['heartFailure','hypothyroidism','hypertension'], meds:['med-006','med-002','med-010'], primaryPrac:'prac-003', org:'org-001' },
  { id:'pat-019', family:'Rodriguez', given:'Daniel',    gender:'male',   dob:'1972-09-14', conditions:['hyperlipidemia'],                        meds:['med-003'], primaryPrac:'prac-001', org:'org-002' },
  { id:'pat-020', family:'Lewis',     given:'Amelia',    gender:'female', dob:'2000-06-30', conditions:[],                                        meds:[], primaryPrac:'prac-005', org:'org-001' },
];

const conditionDefs = {
  hypertension:        { text:'Essential Hypertension',         snomed:'73211009',  icd:'I10',   severity:'moderate' },
  hyperlipidemia:      { text:'Hyperlipidemia',                 snomed:'55822004',  icd:'E78.5', severity:'mild' },
  type2diabetes:       { text:'Type 2 Diabetes Mellitus',       snomed:'44054006',  icd:'E11',   severity:'moderate' },
  obesity:             { text:'Obesity',                        snomed:'414916001', icd:'E66',   severity:'moderate' },
  coronaryArteryDisease:{ text:'Coronary Artery Disease',       snomed:'414545008', icd:'I25.1', severity:'severe' },
  heartFailure:        { text:'Congestive Heart Failure',       snomed:'42343007',  icd:'I50',   severity:'severe' },
  asthma:              { text:'Asthma',                         snomed:'195967001', icd:'J45',   severity:'moderate' },
  ckd:                 { text:'Chronic Kidney Disease Stage 3', snomed:'433144002', icd:'N18.3', severity:'moderate' },
  hypothyroidism:      { text:'Hypothyroidism',                 snomed:'40930008',  icd:'E03.9', severity:'mild' },
  depression:          { text:'Major Depressive Disorder',      snomed:'370143000', icd:'F32',   severity:'moderate' },
  anxiety:             { text:'Generalized Anxiety Disorder',   snomed:'197480006', icd:'F41.1', severity:'moderate' },
  gerd:                { text:'Gastroesophageal Reflux Disease',snomed:'235595009', icd:'K21',   severity:'mild' },
  rheumatoidArthritis: { text:'Rheumatoid Arthritis',           snomed:'69896004',  icd:'M06.9', severity:'moderate' },
  breastCancer:        { text:'Breast Cancer',                  snomed:'254837009', icd:'C50',   severity:'severe' },
  atrialFibrillation:  { text:'Atrial Fibrillation',            snomed:'49436004',  icd:'I48',   severity:'moderate' },
  allergicRhinitis:    { text:'Allergic Rhinitis',              snomed:'61582004',  icd:'J30.4', severity:'mild' },
};

const allergyData = [
  { pid:'pat-001', substance:'Penicillin',  type:'allergy',     category:'medication', criticality:'high',   reaction:'Anaphylaxis', severity:'severe' },
  { pid:'pat-004', substance:'Peanuts',     type:'intolerance', category:'food',       criticality:'high',   reaction:'Urticaria, angioedema', severity:'severe' },
  { pid:'pat-006', substance:'Sulfa drugs', type:'allergy',     category:'medication', criticality:'high',   reaction:'Rash, hives', severity:'moderate' },
  { pid:'pat-008', substance:'Latex',       type:'allergy',     category:'environment',criticality:'low',    reaction:'Contact dermatitis', severity:'mild' },
  { pid:'pat-009', substance:'Aspirin',     type:'intolerance', category:'medication', criticality:'low',    reaction:'GI upset', severity:'mild' },
  { pid:'pat-012', substance:'Tree nuts',   type:'allergy',     category:'food',       criticality:'high',   reaction:'Anaphylaxis', severity:'severe' },
  { pid:'pat-013', substance:'Iodine contrast',type:'allergy',  category:'medication', criticality:'high',   reaction:'Anaphylactoid reaction', severity:'severe' },
  { pid:'pat-016', substance:'Codeine',     type:'allergy',     category:'medication', criticality:'low',    reaction:'Nausea, vomiting', severity:'moderate' },
  { pid:'pat-018', substance:'Shellfish',   type:'intolerance', category:'food',       criticality:'low',    reaction:'GI upset', severity:'mild' },
  { pid:'pat-020', substance:'Amoxicillin', type:'allergy',     category:'medication', criticality:'low',    reaction:'Rash', severity:'mild' },
];

const immunizationCatalog = [
  { code:'141', name:'Influenza, seasonal, injectable', site:'Left arm', route:'Intramuscular' },
  { code:'208', name:'COVID-19, mRNA (Pfizer-BioNTech)', site:'Left arm', route:'Intramuscular' },
  { code:'21',  name:'Varicella vaccine', site:'Right arm', route:'Subcutaneous' },
  { code:'33',  name:'Pneumococcal polysaccharide vaccine (PPSV23)', site:'Right arm', route:'Intramuscular' },
  { code:'115', name:'Tetanus toxoid, reduced diphtheria (Tdap)', site:'Left arm', route:'Intramuscular' },
  { code:'83',  name:'Hepatitis A, pediatric, unspecified', site:'Right arm', route:'Intramuscular' },
  { code:'43',  name:'Hepatitis B vaccine', site:'Left arm', route:'Intramuscular' },
  { code:'62',  name:'Human papilloma virus vaccine (quadrivalent)', site:'Right arm', route:'Intramuscular' },
];

// ─── GENERATE PATIENTS ───────────────────────────────────────────────────────
const patients = patientPersonas.map(p => ({
  resourceType:'Patient', id:p.id, active:true,
  name:[{use:'official',family:p.family,given:[p.given]}],
  gender:p.gender, birthDate:p.dob,
  telecom:[
    {system:'phone',value:`555-${String(Math.floor(Math.random()*900)+100)}-${String(Math.floor(Math.random()*9000)+1000)}`,use:'home'},
    {system:'email',value:`${p.given.toLowerCase()}.${p.family.toLowerCase()}@example.com`}
  ],
  address:[{use:'home',line:[`${Math.floor(Math.random()*999)+1} ${pick(['Oak','Maple','Pine','Elm','Cedar','Birch'])} ${pick(['St','Ave','Dr','Rd','Blvd'])}`],city:pick(['Springfield','Shelbyville','Capital City','Ogdenville']),state:'IL',postalCode:`627${String(Math.floor(Math.random()*90)+10)}`,country:'US'}],
  identifier:[{use:'usual',system:'urn:oid:2.16.840.1.113883.4.1',value:`999-${String(p.id.split('-')[1]).padStart(2,'0')}-${String(Math.floor(Math.random()*9000)+1000)}`}],
  generalPractitioner:[ref('Practitioner',p.primaryPrac,pracName(p.primaryPrac))],
  managingOrganization:ref('Organization',p.org),
  meta:metaNow()
}));

// ─── GENERATE CONDITIONS ─────────────────────────────────────────────────────
const conditions = [];
patientPersonas.forEach(p => {
  p.conditions.forEach(cKey => {
    const cd = conditionDefs[cKey];
    const onsetY = 2010 + Math.floor(Math.random()*14);
    const cid = id('cond');
    conditions.push({
      resourceType:'Condition', id:cid,
      clinicalStatus:{coding:[coding('http://terminology.hl7.org/CodeSystem/condition-clinical','active','Active')]},
      verificationStatus:{coding:[coding('http://terminology.hl7.org/CodeSystem/condition-ver-status','confirmed','Confirmed')]},
      category:[{coding:[coding('http://terminology.hl7.org/CodeSystem/condition-category','problem-list-item','Problem List Item')]}],
      severity:{coding:[coding('http://snomed.info/sct','',cd.severity)],text:cd.severity},
      code:{coding:[coding('http://snomed.info/sct',cd.snomed,cd.text),coding('http://hl7.org/fhir/sid/icd-10-cm',cd.icd,cd.text)],text:cd.text},
      subject:ref('Patient',p.id,`${p.given} ${p.family}`),
      onsetDateTime:randDate(onsetY,onsetY+3),
      recordedDate:randDate(onsetY,onsetY+3),
      recorder:ref('Practitioner',p.primaryPrac,pracName(p.primaryPrac)),
      meta:metaNow()
    });
  });
});

// ─── GENERATE ENCOUNTERS ─────────────────────────────────────────────────────
// 2-4 encounters per patient
const encounters = [];
patientPersonas.forEach(p => {
  const numEnc = 2 + Math.floor(Math.random()*3);
  for(let i=0;i<numEnc;i++){
    const eid = id('enc');
    const isInpatient = p.conditions.some(c=>['heartFailure','coronaryArteryDisease','breastCancer'].includes(c)) && i===0;
    const encClass = isInpatient ? {system:'http://terminology.hl7.org/CodeSystem/v3-ActCode',code:'IMP',display:'inpatient encounter'} : {system:'http://terminology.hl7.org/CodeSystem/v3-ActCode',code:'AMB',display:'ambulatory'};
    const startDT = randDT(2022,2024);
    const startDate = new Date(startDT);
    const endDate = new Date(startDate.getTime() + (isInpatient ? 3*24*60*60*1000 : 45*60*1000));
    const locId = isInpatient ? 'loc-001' : (p.org==='org-001'?'loc-002':'loc-004');
    encounters.push({
      resourceType:'Encounter', id:eid, status:'finished',
      class:encClass,
      type:[{coding:[coding('http://snomed.info/sct',isInpatient?'11429006':'308335008',isInpatient?'Inpatient admission':'Office visit')],text:isInpatient?'Inpatient admission':'Office visit'}],
      subject:ref('Patient',p.id,`${p.given} ${p.family}`),
      participant:[{individual:ref('Practitioner',p.primaryPrac,pracName(p.primaryPrac))}],
      period:{start:startDT,end:endDate.toISOString()},
      location:[{location:ref('Location',locId)}],
      serviceProvider:ref('Organization',p.org),
      meta:metaNow()
    });
  }
});

// Build a map of patient → encounter IDs for cross-referencing
const patEncMap = {};
encounters.forEach(e => {
  const pid = e.subject.reference.split('/')[1];
  if(!patEncMap[pid]) patEncMap[pid] = [];
  patEncMap[pid].push(e.id);
});

// ─── GENERATE OBSERVATIONS ───────────────────────────────────────────────────
// Vital signs + labs per patient
const obsCatalog = [
  { loinc:'85354-9', name:'Blood pressure panel', isPanel:true, children:[
    {loinc:'8480-6',name:'Systolic BP',  unit:'mmHg',  min:100, max:180},
    {loinc:'8462-4',name:'Diastolic BP', unit:'mmHg',  min:60,  max:110},
  ]},
  { loinc:'29463-7', name:'Body weight',     unit:'kg',   min:55,  max:130, cat:'vital-signs' },
  { loinc:'8302-2',  name:'Body height',     unit:'cm',   min:155, max:195, cat:'vital-signs' },
  { loinc:'8867-4',  name:'Heart rate',      unit:'/min', min:55,  max:105, cat:'vital-signs' },
  { loinc:'59408-5', name:'Oxygen saturation',unit:'%',   min:93,  max:100, cat:'vital-signs' },
  { loinc:'4548-4',  name:'HbA1c',           unit:'%',   min:4.5, max:12,  cat:'laboratory', conditions:['type2diabetes'] },
  { loinc:'2160-0',  name:'Creatinine',      unit:'mg/dL',min:0.6, max:3.2, cat:'laboratory' },
  { loinc:'2085-9',  name:'HDL Cholesterol', unit:'mg/dL',min:30,  max:80,  cat:'laboratory', conditions:['hyperlipidemia','coronaryArteryDisease'] },
  { loinc:'13457-7', name:'LDL Cholesterol', unit:'mg/dL',min:60,  max:220, cat:'laboratory', conditions:['hyperlipidemia','coronaryArteryDisease'] },
  { loinc:'2089-1',  name:'Total Cholesterol',unit:'mg/dL',min:120,max:300, cat:'laboratory' },
  { loinc:'2345-7',  name:'Glucose',         unit:'mg/dL',min:70,  max:320, cat:'laboratory' },
  { loinc:'6301-6',  name:'INR',             unit:'',     min:0.9, max:4.5, cat:'laboratory', conditions:['atrialFibrillation','heartFailure'] },
  { loinc:'17861-6', name:'Calcium',         unit:'mg/dL',min:8.4, max:10.5,cat:'laboratory' },
  { loinc:'3094-0',  name:'BUN',             unit:'mg/dL',min:7,   max:40,  cat:'laboratory', conditions:['ckd','heartFailure'] },
  { loinc:'33914-3', name:'eGFR',            unit:'mL/min/1.73m²',min:15,max:120,cat:'laboratory',conditions:['ckd'] },
];

function randVal(min, max) { return Math.round((min + Math.random()*(max-min))*10)/10; }

const observations = [];
patientPersonas.forEach(p => {
  const encIds = patEncMap[p.id] || [];
  const numObs = 2 + Math.floor(Math.random()*3); // observations per encounter
  encIds.slice(0,2).forEach(encId => {
    const enc = encounters.find(e=>e.id===encId);
    const encDate = enc?.period?.start || randDT(2022,2024);

    // Vital signs for every encounter
    ['29463-7','8302-2','8867-4','59408-5'].forEach(loincCode => {
      const o = obsCatalog.find(x=>x.loinc===loincCode);
      if(!o) return;
      const oid = id('obs');
      observations.push({
        resourceType:'Observation', id:oid, status:'final',
        category:[{coding:[coding('http://terminology.hl7.org/CodeSystem/observation-category','vital-signs','Vital Signs')]}],
        code:{coding:[coding('http://loinc.org',o.loinc,o.name)],text:o.name},
        subject:ref('Patient',p.id,`${p.given} ${p.family}`),
        encounter:ref('Encounter',encId),
        effectiveDateTime:encDate,
        valueQuantity:{value:randVal(o.min,o.max),unit:o.unit,system:'http://unitsofmeasure.org',code:o.unit},
        meta:metaNow()
      });
    });

    // Blood pressure panel
    const bpId = id('obs');
    observations.push({
      resourceType:'Observation', id:bpId, status:'final',
      category:[{coding:[coding('http://terminology.hl7.org/CodeSystem/observation-category','vital-signs','Vital Signs')]}],
      code:{coding:[coding('http://loinc.org','85354-9','Blood pressure panel')],text:'Blood pressure'},
      subject:ref('Patient',p.id,`${p.given} ${p.family}`),
      encounter:ref('Encounter',encId),
      effectiveDateTime:encDate,
      component:[
        {code:{coding:[coding('http://loinc.org','8480-6','Systolic BP')]},valueQuantity:{value:randVal(100,180),unit:'mmHg',system:'http://unitsofmeasure.org',code:'mm[Hg]'}},
        {code:{coding:[coding('http://loinc.org','8462-4','Diastolic BP')]},valueQuantity:{value:randVal(60,110),unit:'mmHg',system:'http://unitsofmeasure.org',code:'mm[Hg]'}},
      ],
      meta:metaNow()
    });

    // Labs based on conditions
    obsCatalog.filter(o=>o.cat==='laboratory').forEach(o => {
      if(o.conditions && !o.conditions.some(c=>p.conditions.includes(c))) {
        if(Math.random()>0.3) return; // 30% chance even without the condition
      }
      const oid = id('obs');
      observations.push({
        resourceType:'Observation', id:oid, status:'final',
        category:[{coding:[coding('http://terminology.hl7.org/CodeSystem/observation-category','laboratory','Laboratory')]}],
        code:{coding:[coding('http://loinc.org',o.loinc,o.name)],text:o.name},
        subject:ref('Patient',p.id,`${p.given} ${p.family}`),
        encounter:ref('Encounter',encId),
        effectiveDateTime:encDate,
        valueQuantity:{value:randVal(o.min,o.max),unit:o.unit,system:'http://unitsofmeasure.org',code:o.unit},
        meta:metaNow()
      });
    });
  });
});

// ─── GENERATE MEDICATION REQUESTS ────────────────────────────────────────────
const medicationRequests = [];
const dosageInstructions = {
  'med-001':'Take 1 tablet by mouth twice daily with meals',
  'med-002':'Take 1 tablet by mouth once daily',
  'med-003':'Take 1 tablet by mouth once daily at bedtime',
  'med-004':'Take 1 tablet by mouth once daily',
  'med-005':'Take 1 capsule by mouth once daily before breakfast',
  'med-006':'Take 1 tablet by mouth once daily on empty stomach',
  'med-007':'Take 1 tablet by mouth once daily',
  'med-008':'Inhale 2 puffs by mouth every 4-6 hours as needed',
  'med-009':'Take 1 tablet by mouth once daily (dose per INR)',
  'med-010':'Take 1 tablet by mouth once daily in the morning',
  'med-011':'Take 1 tablet by mouth once daily with food',
  'med-012':'Inject 10 units subcutaneously once daily at bedtime',
};
patientPersonas.forEach(p => {
  const encIds = patEncMap[p.id] || [];
  p.meds.forEach(medId => {
    const med = medCatalog.find(m=>m.id===medId);
    const encId = pick(encIds) || null;
    const enc = encId ? encounters.find(e=>e.id===encId) : null;
    const authoredOn = enc?.period?.start?.slice(0,10) || randDate(2022,2024);
    const rxId = id('medrx');
    medicationRequests.push({
      resourceType:'MedicationRequest', id:rxId, status:'active', intent:'order',
      medicationReference:ref('Medication',medId,med?.name||medId),
      subject:ref('Patient',p.id,`${p.given} ${p.family}`),
      encounter:encId?ref('Encounter',encId):undefined,
      authoredOn,
      requester:ref('Practitioner',p.primaryPrac,pracName(p.primaryPrac)),
      dosageInstruction:[{text:dosageInstructions[medId]||'As directed'}],
      dispenseRequest:{validityPeriod:{start:authoredOn,end:String(parseInt(authoredOn.slice(0,4))+1)+authoredOn.slice(4)},numberOfRepeatsAllowed:11,quantity:{value:30,unit:'tablet',system:'http://terminology.hl7.org/CodeSystem/v3-orderableDrugForm'}},
      meta:metaNow()
    });
  });
});
// Clean up undefined encounter refs
medicationRequests.forEach(r => { if(!r.encounter) delete r.encounter; });

// ─── GENERATE ALLERGY INTOLERANCES ───────────────────────────────────────────
const allergyIntolerances = allergyData.map(a => {
  const p = patientPersonas.find(x=>x.id===a.pid);
  const aid = id('allergy');
  return {
    resourceType:'AllergyIntolerance', id:aid,
    clinicalStatus:{coding:[coding('http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical','active','Active')]},
    verificationStatus:{coding:[coding('http://terminology.hl7.org/CodeSystem/allergyintolerance-verification','confirmed','Confirmed')]},
    type:a.type, category:[a.category], criticality:a.criticality,
    code:{coding:[{system:'http://snomed.info/sct',display:a.substance}],text:a.substance},
    patient:ref('Patient',a.pid,p?`${p.given} ${p.family}`:a.pid),
    onsetDateTime:randDate(1990,2015),
    recordedDate:randDate(2015,2022),
    reaction:[{manifestation:[{coding:[{system:'http://snomed.info/sct',display:a.reaction}],text:a.reaction}],severity:a.severity}],
    meta:metaNow()
  };
});

// ─── GENERATE PROCEDURES ─────────────────────────────────────────────────────
const procedureDefs = [
  { snomed:'392230005', name:'Echocardiogram',                conditions:['heartFailure','coronaryArteryDisease','atrialFibrillation'] },
  { snomed:'174432005', name:'Cardiac catheterization',       conditions:['coronaryArteryDisease'] },
  { snomed:'80146002',  name:'Appendectomy',                  conditions:[] },
  { snomed:'387713003', name:'Coronary artery bypass graft',  conditions:['coronaryArteryDisease'] },
  { snomed:'274025005', name:'Colonoscopy',                   conditions:[] },
  { snomed:'241551005', name:'Holter monitor (24-hour)',      conditions:['atrialFibrillation','heartFailure'] },
  { snomed:'44870000',  name:'Pulmonary function test',       conditions:['asthma'] },
  { snomed:'71651007',  name:'Mammography',                   conditions:['breastCancer'] },
  { snomed:'9416002',   name:'Core needle biopsy of breast',  conditions:['breastCancer'] },
  { snomed:'450566007', name:'Hemoglobin A1c measurement',    conditions:['type2diabetes'] },
  { snomed:'417742002', name:'Renal biopsy',                  conditions:['ckd'] },
];

const procedures = [];
patientPersonas.forEach(p => {
  const relevant = procedureDefs.filter(pd => pd.conditions.length===0 || pd.conditions.some(c=>p.conditions.includes(c)));
  const chosen = pickN(relevant.length>0?relevant:procedureDefs, Math.min(relevant.length||1, 1+Math.floor(Math.random()*2)));
  const encIds = patEncMap[p.id] || [];
  chosen.forEach(pd => {
    const encId = pick(encIds) || null;
    const enc = encId ? encounters.find(e=>e.id===encId) : null;
    const performedDT = enc?.period?.start || randDT(2020,2024);
    const pid2 = id('proc');
    procedures.push({
      resourceType:'Procedure', id:pid2, status:'completed',
      code:{coding:[coding('http://snomed.info/sct',pd.snomed,pd.name)],text:pd.name},
      subject:ref('Patient',p.id,`${p.given} ${p.family}`),
      encounter:encId?ref('Encounter',encId):undefined,
      performedDateTime:performedDT,
      performer:[{actor:ref('Practitioner',p.primaryPrac,pracName(p.primaryPrac))}],
      meta:metaNow()
    });
  });
});
procedures.forEach(r => { if(!r.encounter) delete r.encounter; });

// ─── GENERATE DIAGNOSTIC REPORTS ─────────────────────────────────────────────
const drDefs = [
  { loinc:'58410-2', name:'CBC Panel',                    cat:'LAB',  conditions:[] },
  { loinc:'24323-8', name:'Comprehensive Metabolic Panel', cat:'LAB',  conditions:[] },
  { loinc:'24331-1', name:'Lipid Panel',                  cat:'LAB',  conditions:['hyperlipidemia','coronaryArteryDisease'] },
  { loinc:'36643-5', name:'Chest X-Ray 2 Views',          cat:'RAD',  conditions:['heartFailure','coronaryArteryDisease'] },
  { loinc:'18745-0', name:'Cardiac Catheterization Report',cat:'RAD',  conditions:['coronaryArteryDisease'] },
  { loinc:'11525-3', name:'Obstetric Ultrasound',          cat:'RAD',  conditions:[] },
  { loinc:'10524-7', name:'Microscopic observation of specimen from Cervix', cat:'PAT', conditions:[] },
  { loinc:'24604-1', name:'MRI of Brain',                 cat:'RAD',  conditions:[] },
];
const drConclusions = {
  '58410-2': 'CBC within normal limits. No significant abnormalities detected.',
  '24323-8': 'Comprehensive metabolic panel within normal limits.',
  '24331-1': 'Elevated LDL cholesterol. Recommend dietary modification and statin therapy.',
  '36643-5': 'Mild cardiomegaly. No acute pulmonary infiltrates. Mild pleural effusion noted.',
  '18745-0': 'Significant stenosis of LAD artery. Recommend revascularization.',
  '11525-3': 'Normal obstetric findings.',
  '10524-7': 'Normal cervical cytology. No evidence of malignancy.',
  '24604-1': 'No acute intracranial abnormality.',
};

const diagnosticReports = [];
patientPersonas.forEach(p => {
  const relevant = drDefs.filter(d => d.conditions.length===0||d.conditions.some(c=>p.conditions.includes(c)));
  const chosen = pickN(relevant.length>0?relevant:drDefs.slice(0,2), Math.min(relevant.length||1, 1+Math.floor(Math.random()*2)));
  const encIds = patEncMap[p.id]||[];
  chosen.forEach(d => {
    const encId = pick(encIds)||null;
    const enc = encId?encounters.find(e=>e.id===encId):null;
    const effDate = enc?.period?.start?.slice(0,10)||randDate(2022,2024);
    const did = id('dr');
    diagnosticReports.push({
      resourceType:'DiagnosticReport', id:did, status:'final',
      category:[{coding:[coding('http://terminology.hl7.org/CodeSystem/v2-0074',d.cat,d.cat)]}],
      code:{coding:[coding('http://loinc.org',d.loinc,d.name)],text:d.name},
      subject:ref('Patient',p.id,`${p.given} ${p.family}`),
      encounter:encId?ref('Encounter',encId):undefined,
      effectiveDateTime:effDate,
      issued:effDate+'T12:00:00Z',
      performer:[ref('Organization',p.org)],
      conclusion:drConclusions[d.loinc]||'Report findings documented.',
      meta:metaNow()
    });
  });
});
diagnosticReports.forEach(r=>{ if(!r.encounter) delete r.encounter; });

// ─── GENERATE APPOINTMENTS ────────────────────────────────────────────────────
const apptReasons = ['Annual wellness visit','Follow-up: hypertension','Follow-up: diabetes management','Medication review','Lab result review','Specialist consultation','Post-operative follow-up','Routine physical exam','Chronic disease management','Pre-operative assessment'];
const apptStatuses = ['booked','fulfilled','cancelled','booked','fulfilled','fulfilled'];
const appointments = [];
patientPersonas.forEach(p => {
  const numAppts = 2 + Math.floor(Math.random()*3);
  for(let i=0;i<numAppts;i++){
    const apptId = id('appt');
    const startDT = randDT(2024,2025);
    const startD = new Date(startDT);
    const endD = new Date(startD.getTime()+30*60*1000);
    appointments.push({
      resourceType:'Appointment', id:apptId,
      status:pick(apptStatuses),
      serviceType:[{coding:[coding('http://terminology.hl7.org/CodeSystem/service-type','124','General Practice')]}],
      reasonCode:[{text:pick(apptReasons)}],
      start:startDT, end:endD.toISOString(),
      participant:[
        {actor:ref('Patient',p.id,`${p.given} ${p.family}`),required:'required',status:'accepted'},
        {actor:ref('Practitioner',p.primaryPrac,pracName(p.primaryPrac)),required:'required',status:'accepted'},
      ],
      meta:metaNow()
    });
  }
});

// ─── GENERATE IMMUNIZATIONS ───────────────────────────────────────────────────
const immunizations = [];
patientPersonas.forEach(p => {
  const numImm = 2 + Math.floor(Math.random()*4);
  pickN(immunizationCatalog, numImm).forEach(imm => {
    const iid = id('imm');
    immunizations.push({
      resourceType:'Immunization', id:iid, status:'completed',
      vaccineCode:{coding:[coding('http://hl7.org/fhir/sid/cvx',imm.code,imm.name)],text:imm.name},
      patient:ref('Patient',p.id,`${p.given} ${p.family}`),
      occurrenceDateTime:randDate(2018,2024),
      primarySource:true,
      lotNumber:`LOT-${Math.floor(Math.random()*99999)}`,
      site:{coding:[{system:'http://terminology.hl7.org/CodeSystem/v3-ActSite',display:imm.site}]},
      route:{coding:[{system:'http://terminology.hl7.org/CodeSystem/v3-RouteOfAdministration',display:imm.route}]},
      performer:[{actor:ref('Practitioner',p.primaryPrac,pracName(p.primaryPrac))}],
      meta:metaNow()
    });
  });
});

// ─── GENERATE CARE PLANS ──────────────────────────────────────────────────────
const cpGoals = {
  type2diabetes:  ['Maintain HbA1c below 7.0%','Achieve fasting glucose 80-130 mg/dL','Complete diabetes self-management education'],
  hypertension:   ['Maintain blood pressure below 130/80 mmHg','Reduce dietary sodium intake','Engage in 150 minutes of moderate exercise per week'],
  heartFailure:   ['Monitor daily weights; report gain >2 lbs/day','Maintain fluid restriction of 2L/day','Achieve optimal medication adherence'],
  coronaryArteryDisease:['Maintain LDL below 70 mg/dL','Complete cardiac rehabilitation program','Quit smoking if applicable'],
  asthma:         ['Maintain asthma control with no nighttime symptoms','Minimize rescue inhaler use to <2 days/week','Identify and avoid asthma triggers'],
  breastCancer:   ['Complete chemotherapy course as scheduled','Attend all oncology follow-up appointments','Maintain adequate nutrition during treatment'],
};
const carePlans = [];
patientPersonas.forEach(p => {
  const mainCondition = p.conditions[0];
  if(!mainCondition) return;
  const goals = cpGoals[mainCondition] || ['Manage chronic condition effectively','Maintain regular follow-up appointments'];
  const cpid = id('cp');
  const startDate = randDate(2023,2024);
  const matchedCondition = conditions.find(c => c.subject.reference===`Patient/${p.id}`);
  carePlans.push({
    resourceType:'CarePlan', id:cpid, status:'active', intent:'plan',
    title:`${conditionDefs[mainCondition]?.text||mainCondition} Management Plan`,
    description:`Comprehensive management plan for ${p.given} ${p.family}`,
    subject:ref('Patient',p.id,`${p.given} ${p.family}`),
    period:{start:startDate},
    author:ref('Practitioner',p.primaryPrac,pracName(p.primaryPrac)),
    careTeam:[ref('Practitioner',p.primaryPrac,pracName(p.primaryPrac))],
    addresses:matchedCondition?[ref('Condition',matchedCondition.id,conditionDefs[mainCondition]?.text)]:[],
    goal:goals.map(g=>({description:{text:g}})),
    activity:p.meds.slice(0,2).map(medId=>{
      const med=medCatalog.find(m=>m.id===medId);
      return {detail:{kind:'MedicationRequest',code:{text:med?med.name:medId},status:'in-progress'}};
    }),
    meta:metaNow()
  });
});

// ─── WRITE FILES ──────────────────────────────────────────────────────────────
function write(filename, data) {
  const outPath = path.join(OUT, filename);
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2));
  console.log(`  ✅ ${filename.padEnd(30)} ${data.length} records`);
}

console.log('\n📦 Writing seed data files…\n');
write('Organization.json',      orgs);
write('Location.json',          locations);
write('Practitioner.json',      practitioners);
write('Medication.json',        medications);
write('Patient.json',           patients);
write('Condition.json',         conditions);
write('Encounter.json',         encounters);
write('Observation.json',       observations);
write('MedicationRequest.json', medicationRequests);
write('AllergyIntolerance.json',allergyIntolerances);
write('Procedure.json',         procedures);
write('DiagnosticReport.json',  diagnosticReports);
write('Appointment.json',       appointments);
write('Immunization.json',      immunizations);
write('CarePlan.json',          carePlans);

const total = [orgs,locations,practitioners,medications,patients,conditions,encounters,observations,medicationRequests,allergyIntolerances,procedures,diagnosticReports,appointments,immunizations,carePlans].reduce((s,a)=>s+a.length,0);
console.log(`\n✨ Done — ${total} total FHIR resources across 15 types\n`);
console.log('Next steps:');
console.log('  npm run seed:clear   (wipe existing data and re-seed from new files)');
console.log('  npm run seed         (add new records without clearing)\n');
