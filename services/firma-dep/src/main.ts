import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as express from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const bodyLimit = process.env.HTTP_BODY_LIMIT || '25mb';
  const env = process.env.NODE_ENV ?? 'development';

  // Solo confiar en X-Forwarded-For si viene del proxy/balanceador inmediato
  // conocido. Ajustar el numero de saltos segun la topologia real (nginx/ALB).
  app
    .getHttpAdapter()
    .getInstance()
    .set('trust proxy', Number(process.env.TRUST_PROXY_HOPS ?? 1));

  app.use(helmet());

  const corsOrigins = (process.env.CORS_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({
    origin: corsOrigins.length > 0 ? corsOrigins : false,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'x-client-id', 'x-api-key'],
  });

  app.setGlobalPrefix('api/v1');
  // Los PDFs viajan en base64 dentro de JSON; por eso el limite del body
  // debe ser mas alto que el default de Express para evitar 413.
  app.use(express.json({ limit: bodyLimit }));
  app.use(express.urlencoded({ limit: bodyLimit, extended: true }));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const swaggerAllowed = env !== 'production' || process.env.SWAGGER_ENABLED === 'true';
  if (swaggerAllowed && process.env.SWAGGER_ENABLED !== 'false') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('firma-dep')
      .setDescription(
        'API de firma reutilizable para aplicaciones DEP. Recibe PDFs base, agrega validacion comun y delega la firma a FirmaGob.',
      )
      .setVersion('1.0.0')
      .build();
    const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, swaggerDocument);
  }

  const port = Number(process.env.PORT ?? 4010);
  const swaggerEnabled = swaggerAllowed && process.env.SWAGGER_ENABLED !== 'false';

  app.getHttpAdapter().get('/demo', (_req, res) => {
    if (env === 'production' && process.env.DEMO_ENABLED !== 'true') {
      res.status(404).send('Not found');
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const demoClientId = process.env.DEMO_CLIENT_ID || 'demo';
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const demoApiKey = process.env.DEMO_API_KEY || 'demo-key';

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Preview de Firma — firma-dep</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f0f2f5; min-height: 100vh; display: flex; flex-direction: column; }
    header { background: #1560a0; padding: 0 2rem; display: flex; align-items: center; gap: 1rem; height: 64px; border-bottom: 4px solid #d62828; flex-shrink: 0; }
    header .escudo { font-size: 2rem; color: #fff; }
    header .gov-name { color: #fff; font-size: 0.85rem; line-height: 1.3; border-left: 1px solid rgba(255,255,255,0.4); padding-left: 1rem; }
    header .gov-name strong { display: block; font-size: 1rem; }
    header .back-link { margin-left: auto; color: rgba(255,255,255,0.8); font-size: 0.85rem; text-decoration: none; white-space: nowrap; }
    header .back-link:hover { color: #fff; }
    main { flex: 1; display: flex; overflow: hidden; height: calc(100vh - 64px - 36px); }
    .panel-form { width: 360px; min-width: 360px; background: #fff; border-right: 1px solid #e0e0e0; display: flex; flex-direction: column; overflow-y: auto; }
    .panel-form-header { background: #1560a0; padding: 1.25rem 1.5rem; color: #fff; flex-shrink: 0; }
    .panel-form-header h1 { font-size: 1.1rem; font-weight: 700; }
    .panel-form-header p { font-size: 0.78rem; opacity: 0.85; margin-top: 0.2rem; line-height: 1.4; }
    .panel-form-body { padding: 1.1rem 1.25rem; display: flex; flex-direction: column; gap: 0.85rem; }
    .drop-zone { border: 2px dashed #cbd5e0; border-radius: 8px; padding: 1.25rem 0.75rem; text-align: center; cursor: pointer; transition: all 0.2s; background: #f8fafc; }
    .drop-zone:hover, .drop-zone.drag-over { border-color: #1560a0; background: #eff6ff; }
    .drop-zone.has-file { border-color: #27ae60; background: #f0fdf4; border-style: solid; }
    .drop-zone input[type=file] { display: none; }
    .drop-zone .dz-icon { font-size: 1.75rem; margin-bottom: 0.35rem; }
    .drop-zone p { font-size: 0.8rem; color: #666; }
    .drop-zone .file-name { font-size: 0.82rem; font-weight: 600; color: #1560a0; margin-top: 0.2rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .field-group { display: flex; flex-direction: column; gap: 0.3rem; }
    .field-group label { font-size: 0.78rem; font-weight: 600; color: #374151; }
    .field-group label .opt { font-weight: 400; color: #9ca3af; }
    .field-group input[type=text], .field-group input[type=number], .field-group input[type=url] { border: 1px solid #d1d5db; border-radius: 6px; padding: 0.45rem 0.65rem; font-size: 0.82rem; width: 100%; outline: none; }
    .field-group input:focus { border-color: #1560a0; box-shadow: 0 0 0 3px rgba(21,96,160,0.1); }
    .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.65rem; }
    .toggle-row { display: flex; align-items: center; justify-content: space-between; }
    .toggle-row span { font-size: 0.82rem; color: #374151; font-weight: 600; }
    .toggle { position: relative; display: inline-block; width: 38px; height: 20px; }
    .toggle input { opacity: 0; width: 0; height: 0; }
    .toggle-slider { position: absolute; inset: 0; background: #d1d5db; border-radius: 20px; transition: 0.2s; cursor: pointer; }
    .toggle-slider::before { content: ''; position: absolute; width: 14px; height: 14px; left: 3px; top: 3px; background: #fff; border-radius: 50%; transition: 0.2s; }
    .toggle input:checked + .toggle-slider { background: #1560a0; }
    .toggle input:checked + .toggle-slider::before { transform: translateX(18px); }
    .seal-options { display: flex; flex-direction: column; gap: 0.65rem; }
    .btn-submit { background: #1560a0; color: #fff; border: none; border-radius: 6px; padding: 0.65rem; font-size: 0.9rem; font-weight: 600; cursor: pointer; transition: background 0.15s; width: 100%; margin-top: 0.25rem; }
    .btn-submit:hover:not(:disabled) { background: #0e4b87; }
    .btn-submit:disabled { background: #9ca3af; cursor: not-allowed; }
    .divider { border: none; border-top: 1px solid #e5e7eb; margin: 0.1rem 0; }
    .section-title { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #9ca3af; }
    .panel-preview { flex: 1; display: flex; flex-direction: column; min-width: 0; }
    .preview-toolbar { background: #fff; border-bottom: 1px solid #e0e0e0; padding: 0.65rem 1.25rem; display: flex; align-items: center; gap: 1rem; flex-shrink: 0; }
    .preview-toolbar .title { font-size: 0.85rem; font-weight: 600; color: #374151; flex: 1; }
    .btn-download { background: #f0f5ff; color: #1560a0; border: 1px solid #c7d8f0; border-radius: 6px; padding: 0.35rem 0.8rem; font-size: 0.8rem; font-weight: 600; cursor: pointer; text-decoration: none; display: none; white-space: nowrap; }
    .btn-download:hover { background: #dbeafe; }
    .preview-content { flex: 1; display: flex; align-items: center; justify-content: center; background: #e5e7eb; position: relative; overflow: hidden; }
    .preview-content iframe { width: 100%; height: 100%; border: none; display: block; }
    .preview-empty { text-align: center; color: #9ca3af; padding: 2rem; }
    .preview-empty .big-icon { font-size: 3.5rem; margin-bottom: 0.75rem; }
    .preview-empty p { font-size: 0.88rem; line-height: 1.6; }
    .preview-empty strong { color: #6b7280; }
    .spinner { width: 36px; height: 36px; border: 3px solid #e0e0e0; border-top-color: #1560a0; border-radius: 50%; animation: spin 0.7s linear infinite; margin: 0 auto 0.75rem; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .error-box { background: #fff5f5; border: 1px solid #f87171; border-radius: 8px; padding: 1rem; color: #dc2626; font-size: 0.82rem; max-width: 420px; text-align: left; line-height: 1.5; }
    .error-box strong { display: block; margin-bottom: 0.3rem; font-size: 0.9rem; }
    footer { background: #1a2a3a; color: rgba(255,255,255,0.5); text-align: center; font-size: 0.75rem; padding: 0.65rem 1rem; flex-shrink: 0; }
    footer strong { color: rgba(255,255,255,0.8); }
    @media (max-width: 768px) {
      main { flex-direction: column; height: auto; overflow: visible; }
      .panel-form { width: 100%; min-width: unset; border-right: none; border-bottom: 1px solid #e0e0e0; }
      .panel-preview { min-height: 65vh; }
    }
  </style>
</head>
<body>
  <header>
    <span class="escudo">🇨🇱</span>
    <div class="gov-name">
      <strong>Gobierno de Chile</strong>
      Dirección de Educación Pública
    </div>
    <a class="back-link" href="/">← Inicio</a>
  </header>

  <main>
    <aside class="panel-form">
      <div class="panel-form-header">
        <h1>Preview de firma electrónica</h1>
        <p>Visualiza cómo quedará el PDF con el footer de validación y el sello visible antes de firmar.</p>
      </div>
      <div class="panel-form-body">

        <div class="drop-zone" id="dropZone">
          <input type="file" id="fileInput" accept=".pdf,application/pdf" />
          <div class="dz-icon" id="dropIcon">📄</div>
          <p id="dropText">Arrastra un PDF aquí o haz clic para seleccionar</p>
          <p class="file-name" id="fileName"></p>
        </div>

        <hr class="divider" />
        <span class="section-title">Datos del firmante</span>

        <div class="field-group">
          <label for="rut">RUT del firmante</label>
          <input type="text" id="rut" value="22.222.222-2" placeholder="22.222.222-2" />
        </div>

        <div class="field-group">
          <label for="entity">Entidad <span class="opt">(opcional)</span></label>
          <input type="text" id="entity" placeholder="Dirección de Educación Pública" />
        </div>

        <hr class="divider" />
        <span class="section-title">Sello visible</span>

        <div class="toggle-row">
          <span>Mostrar sello visible</span>
          <label class="toggle">
            <input type="checkbox" id="visibleSeal" checked />
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div class="seal-options" id="sealOptions">
          <div class="field-row">
            <div class="field-group">
              <label for="sealPage">Página del sello</label>
              <input type="number" id="sealPage" value="1" min="1" />
            </div>
            <div class="field-group">
              <label for="sealMargin">Margen superior (cm)</label>
              <input type="number" id="sealMargin" value="2" min="0" max="30" step="0.5" />
            </div>
          </div>
        </div>

        <hr class="divider" />
        <span class="section-title">Footer de validación <span class="opt" style="font-size:0.7rem;font-weight:400;text-transform:none;">(opcional)</span></span>

        <div class="field-group">
          <label for="validationUrl">URL de validación <span class="opt">(opcional)</span></label>
          <input type="text" id="validationUrl" value="https://validar.dep.cl/documentos/DEP-2026-0001" placeholder="https://miapp.cl/validar/DEP-2026-0001" />
        </div>

        <div class="field-group">
          <label for="documentId">ID del documento <span class="opt">(opcional)</span></label>
          <input type="text" id="documentId" placeholder="DEP-2026-0001" />
        </div>

        <button class="btn-submit" id="btnPreview" disabled>Generar preview</button>

      </div>
    </aside>

    <section class="panel-preview">
      <div class="preview-toolbar">
        <span class="title" id="previewTitle">Vista previa del documento</span>
        <a class="btn-download" id="btnDownload" download="preview-firmadep.pdf">⬇ Descargar PDF</a>
      </div>
      <div class="preview-content" id="previewContent">
        <div class="preview-empty">
          <div class="big-icon">📋</div>
          <p><strong>Sube un PDF para generar la vista previa</strong><br />El documento se mostrará aquí con el footer<br />de validación y el sello de firma aplicados.</p>
        </div>
      </div>
    </section>
  </main>

  <footer>
    <strong>firma-dep</strong> · Dirección de Educación Pública · Gobierno de Chile
  </footer>

  <script>
    var API_CLIENT_ID = '${demoClientId}';
    var API_KEY = '${demoApiKey}';
    var pdfBase64 = null;
    var currentObjectUrl = null;

    var dropZone = document.getElementById('dropZone');
    var fileInput = document.getElementById('fileInput');
    var fileNameEl = document.getElementById('fileName');
    var dropText = document.getElementById('dropText');
    var dropIcon = document.getElementById('dropIcon');
    var btnPreview = document.getElementById('btnPreview');
    var btnDownload = document.getElementById('btnDownload');
    var previewContent = document.getElementById('previewContent');
    var previewTitle = document.getElementById('previewTitle');
    var visibleSealCheck = document.getElementById('visibleSeal');
    var sealOptions = document.getElementById('sealOptions');

    visibleSealCheck.addEventListener('change', function () {
      sealOptions.style.display = visibleSealCheck.checked ? 'flex' : 'none';
    });

    dropZone.addEventListener('click', function () { fileInput.click(); });
    dropZone.addEventListener('dragover', function (e) { e.preventDefault(); dropZone.classList.add('drag-over'); });
    dropZone.addEventListener('dragleave', function () { dropZone.classList.remove('drag-over'); });
    dropZone.addEventListener('drop', function (e) {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      if (e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener('change', function () {
      if (fileInput.files[0]) setFile(fileInput.files[0]);
    });

    function setFile(file) {
      if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
        alert('Solo se aceptan archivos PDF.');
        return;
      }
      var reader = new FileReader();
      reader.onload = function (e) {
        var dataUrl = e.target.result;
        pdfBase64 = dataUrl.split(',')[1];
        dropZone.classList.add('has-file');
        dropIcon.textContent = '✅';
        dropText.textContent = 'Archivo cargado';
        fileNameEl.textContent = file.name;
        btnPreview.disabled = false;
        btnDownload.download = file.name.replace('.pdf', '') + '-preview.pdf';
      };
      reader.readAsDataURL(file);
    }

    btnPreview.addEventListener('click', function () {
      if (!pdfBase64) return;
      generatePreview();
    });

    function generatePreview() {
      btnPreview.disabled = true;
      btnDownload.style.display = 'none';
      previewTitle.textContent = 'Generando preview...';
      previewContent.innerHTML = '<div class="preview-empty"><div class="spinner"></div><p>Procesando el documento...</p></div>';

      if (currentObjectUrl) {
        URL.revokeObjectURL(currentObjectUrl);
        currentObjectUrl = null;
      }

      var rut = document.getElementById('rut').value.trim() || '22.222.222-2';
      var entity = document.getElementById('entity').value.trim();
      var visibleSeal = visibleSealCheck.checked;
      var sealPage = parseInt(document.getElementById('sealPage').value, 10) || 1;
      var sealMarginRaw = parseFloat(document.getElementById('sealMargin').value);
      var sealMargin = isNaN(sealMarginRaw) ? 2 : sealMarginRaw;
      var validationUrl = document.getElementById('validationUrl').value.trim();
      var documentId = document.getElementById('documentId').value.trim();
      var currentFileName = fileNameEl.textContent || 'documento.pdf';

      var signature = {
        mode: 'desatendida',
        rut: rut,
        visibleSeal: visibleSeal,
        sealPage: sealPage,
        sealTopMarginCm: sealMargin
      };
      if (entity) signature.entity = entity;

      var payload = {
        pdfBase64: pdfBase64,
        fileName: currentFileName,
        signature: signature
      };

      if (validationUrl || documentId) {
        var validation = { enabled: true };
        if (validationUrl) { validation.url = validationUrl; validation.qrPayload = validationUrl; }
        if (documentId) validation.documentId = documentId;
        payload.validation = validation;
      }

      fetch('/api/v1/signatures/preview-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-client-id': API_CLIENT_ID, 'x-api-key': API_KEY },
        body: JSON.stringify(payload)
      })
      .then(function (res) {
        if (!res.ok) return res.json().then(function (err) { throw err; });
        return res.json();
      })
      .then(function (data) {
        if (!data.ok || !data.result || !data.result.previewPdfBase64) {
          throw new Error('Respuesta inesperada del servidor.');
        }
        var b64 = data.result.previewPdfBase64;
        var byteChars = atob(b64);
        var bytes = new Uint8Array(byteChars.length);
        for (var i = 0; i < byteChars.length; i++) { bytes[i] = byteChars.charCodeAt(i); }
        var blob = new Blob([bytes], { type: 'application/pdf' });
        currentObjectUrl = URL.createObjectURL(blob);

        previewContent.innerHTML = '<iframe src="' + currentObjectUrl + '#toolbar=1&navpanes=0" title="Preview del documento firmado"></iframe>';
        previewTitle.textContent = 'Vista previa generada correctamente';
        btnDownload.href = currentObjectUrl;
        btnDownload.style.display = 'inline-block';
        btnPreview.disabled = false;
      })
      .catch(function (err) {
        var msg = (err && (err.message || (err.error ? (err.message || JSON.stringify(err.message)) : JSON.stringify(err)))) || 'Error desconocido';
        previewContent.innerHTML = '<div class="preview-empty"><div class="error-box"><strong>Error al generar el preview</strong>' + escapeHtml(msg) + '</div></div>';
        previewTitle.textContent = 'Vista previa del documento';
        btnPreview.disabled = false;
      });
    }

    function escapeHtml(str) {
      return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
  </script>
</body>
</html>`);
  });

  app.getHttpAdapter().get('/', (_req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>firma-dep — DEP</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f0f2f5;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    header {
      background: #1560a0;
      padding: 0 2rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      height: 64px;
      border-bottom: 4px solid #d62828;
    }
    header .escudo {
      font-size: 2rem;
      color: #fff;
    }
    header .gov-name {
      color: #fff;
      font-size: 0.85rem;
      line-height: 1.3;
      border-left: 1px solid rgba(255,255,255,0.4);
      padding-left: 1rem;
    }
    header .gov-name strong { display: block; font-size: 1rem; }
    main {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }
    .card {
      background: #fff;
      border-radius: 8px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.1);
      max-width: 560px;
      width: 100%;
      overflow: hidden;
    }
    .card-header {
      background: #1560a0;
      padding: 2rem;
      color: #fff;
    }
    .card-header .badge {
      display: inline-block;
      background: rgba(255,255,255,0.2);
      border: 1px solid rgba(255,255,255,0.4);
      border-radius: 20px;
      font-size: 0.72rem;
      padding: 2px 10px;
      margin-bottom: 0.75rem;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .card-header h1 { font-size: 1.8rem; font-weight: 700; }
    .card-header p { margin-top: 0.4rem; opacity: 0.85; font-size: 0.9rem; line-height: 1.5; }
    .card-body { padding: 1.75rem 2rem; }
    .status-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
      font-size: 0.9rem;
      color: #444;
    }
    .dot {
      width: 10px; height: 10px;
      border-radius: 50%;
      background: #27ae60;
      flex-shrink: 0;
      box-shadow: 0 0 0 3px rgba(39,174,96,0.2);
    }
    .links { display: flex; flex-direction: column; gap: 0.6rem; }
    .link-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1rem;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      text-decoration: none;
      color: #1560a0;
      font-size: 0.88rem;
      transition: background 0.15s, border-color 0.15s;
    }
    .link-item:hover { background: #f0f5ff; border-color: #1560a0; }
    .link-item .path { font-family: monospace; font-size: 0.82rem; color: #555; }
    .link-item .arrow { color: #1560a0; font-size: 1rem; }
    .env-badge {
      display: inline-block;
      margin-left: 0.5rem;
      background: ${env === 'production' ? '#27ae60' : '#e67e22'};
      color: #fff;
      font-size: 0.68rem;
      border-radius: 4px;
      padding: 1px 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      vertical-align: middle;
    }
    footer {
      background: #1a2a3a;
      color: rgba(255,255,255,0.5);
      text-align: center;
      font-size: 0.75rem;
      padding: 1rem;
    }
    footer strong { color: rgba(255,255,255,0.8); }
  </style>
</head>
<body>
  <header>
    <span class="escudo">🇨🇱</span>
    <div class="gov-name">
      <strong>Gobierno de Chile</strong>
      Dirección de Educación Pública
    </div>
  </header>
  <main>
    <div class="card">
      <div class="card-header">
        <div class="badge">Microservicio REST</div>
        <h1>firma-dep</h1>
        <p>API de firma electrónica reutilizable. Procesa y firma documentos PDF mediante integración con FirmaGob.</p>
      </div>
      <div class="card-body">
        <div class="status-row">
          <span class="dot"></span>
          Servicio operativo
          <span class="env-badge">${env}</span>
        </div>
        <div class="links">
          <a class="link-item" href="/api/v1/health">
            <span>Estado del servicio</span>
            <span class="path">/api/v1/health &nbsp;<span class="arrow">→</span></span>
          </a>
          ${swaggerEnabled ? `<a class="link-item" href="/docs">
            <span>Documentación de la API</span>
            <span class="path">/docs &nbsp;<span class="arrow">→</span></span>
          </a>` : ''}
          <a class="link-item" href="/demo">
            <span>Preview de firma</span>
            <span class="path">/demo &nbsp;<span class="arrow">→</span></span>
          </a>
          <a class="link-item" href="/api/v1/signatures/capabilities">
            <span>Capacidades del servicio</span>
            <span class="path">/api/v1/signatures/capabilities &nbsp;<span class="arrow">→</span></span>
          </a>
        </div>
      </div>
    </div>
  </main>
  <footer>
    <strong>firma-dep</strong> · Dirección de Educación Pública · Gobierno de Chile
  </footer>
</body>
</html>`);
  });

  if (env === 'production' && process.env.API_SECURITY_ENABLED === 'false') {
    throw new Error(
      'No se puede iniciar firma-dep en produccion con API_SECURITY_ENABLED=false.',
    );
  }

  await app.listen(port);
  // Mantiene visible la URL local del servicio para facilitar pruebas iniciales.
  console.log(`firma-dep escuchando en http://localhost:${port}/api/v1`);
  console.log(
    process.env.SWAGGER_ENABLED !== 'false'
      ? `swagger activo en http://localhost:${port}/docs`
      : 'swagger desactivado por configuracion',
  );
}
bootstrap();
