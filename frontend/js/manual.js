// Manual y Conceptos — explicación operativa del sistema
function renderManual() {
  const app = document.getElementById('app');

  app.innerHTML = `
    <style>
      .manual-toc { position: sticky; top: 0; background: var(--bg, #f5f3eb); z-index: 5;
        padding: .75rem 0; margin-bottom: 1rem; border-bottom: 1px solid var(--border, #e0dac4);
        display: flex; flex-wrap: wrap; gap: .4rem .6rem; }
      .manual-toc a { font-size: .82rem; color: var(--ink-2, #5a4d2e); text-decoration: none;
        padding: .25rem .65rem; border-radius: 14px; background: rgba(27,67,50,.06);
        transition: background .12s; }
      .manual-toc a:hover { background: rgba(27,67,50,.15); color: var(--ink, #1b4332); }
      .manual-section { background: white; border-radius: 10px; padding: 1.4rem 1.6rem;
        margin-bottom: 1.25rem; box-shadow: 0 1px 4px rgba(0,0,0,.05); }
      .manual-section h3 { font-family: var(--font-serif, 'DM Serif Display', serif);
        color: var(--ink, #1b4332); font-size: 1.35rem; margin-bottom: 1rem;
        padding-bottom: .5rem; border-bottom: 2px solid rgba(27,67,50,.15); }
      .manual-section h4 { color: var(--ink, #1b4332); font-size: .95rem; font-weight: 700;
        margin-top: 1rem; margin-bottom: .4rem; }
      .manual-section p { font-size: .92rem; color: var(--ink-2, #4a4a4a); line-height: 1.55;
        margin-bottom: .7rem; }
      .manual-section ul, .manual-section ol { margin: .4rem 0 .8rem 1.4rem; font-size: .9rem;
        color: var(--ink-2, #4a4a4a); line-height: 1.6; }
      .manual-section li { margin-bottom: .25rem; }
      .manual-section li strong { color: var(--ink, #1b4332); }
      .manual-section code { background: #f4f0e2; padding: .1rem .4rem; border-radius: 4px;
        font-family: var(--font-mono, 'DM Mono', monospace); font-size: .85em; color: #6e5a1f; }
      .manual-card-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px,1fr));
        gap: .75rem; margin: .8rem 0; }
      .manual-mini-card { background: #fafaf3; border: 1px solid #e8e2cc; border-left: 3px solid var(--ink, #1b4332);
        border-radius: 6px; padding: .65rem .85rem; font-size: .85rem; }
      .manual-mini-card strong { display: block; color: var(--ink, #1b4332); margin-bottom: .2rem; }
      .manual-ejemplo { background: #f0faf2; border-left: 3px solid #27ae60; padding: .65rem .85rem;
        border-radius: 6px; font-size: .85rem; margin: .5rem 0; }
      .manual-ejemplo strong { color: #1b4332; }
      .manual-warn { background: #fef5e7; border-left: 3px solid #f39c12; padding: .65rem .85rem;
        border-radius: 6px; font-size: .85rem; margin: .5rem 0; }
      .manual-table { width: 100%; border-collapse: collapse; margin: .6rem 0; font-size: .87rem; }
      .manual-table th { background: #f4f0e2; padding: .5rem .8rem; text-align: left;
        font-weight: 600; color: var(--ink, #1b4332); border-bottom: 2px solid #e8e2cc; }
      .manual-table td { padding: .5rem .8rem; border-bottom: 1px solid #f0ebd9; vertical-align: top; }
      .manual-formula { background: #f4f0e2; padding: .65rem .9rem; border-radius: 6px;
        font-family: var(--font-mono, 'DM Mono', monospace); font-size: .88rem; color: #6e5a1f;
        margin: .5rem 0; display: inline-block; }
    </style>

    <h2>Manual y conceptos</h2>
    <p style="color: var(--ink-3, #888); margin-bottom: 1rem; font-size: .92rem">
      Guía operativa de EM-Financiera. Cómo funciona el sistema y los conceptos clave para usarlo bien.
    </p>

    <nav class="manual-toc">
      <a href="#sec-intro">1. Visión general</a>
      <a href="#sec-flujo">2. Flujo principal</a>
      <a href="#sec-conceptos">3. Conceptos clave</a>
      <a href="#sec-amortizacion">4. Tipos de amortización</a>
      <a href="#sec-periodicidad">5. Mensual vs. semanal</a>
      <a href="#sec-pagos">6. Tipos de pago</a>
      <a href="#sec-estados">7. Estados del préstamo</a>
      <a href="#sec-categorias">8. Categorías de tasa</a>
      <a href="#sec-uif">9. Documentación UIF</a>
      <a href="#sec-dashboard">10. Métricas del dashboard</a>
      <a href="#sec-terceros">11. Plata de terceros</a>
      <a href="#sec-faq">12. FAQ</a>
      <a href="#sec-glosario">13. Glosario</a>
    </nav>

    <!-- 1. Intro -->
    <section id="sec-intro" class="manual-section">
      <h3>1. ¿Qué es EM Financiera?</h3>
      <p>Sistema de gestión de préstamos personales operado por la financiera. Permite registrar clientes,
        otorgar préstamos en pesos o dólares, cobrar cuotas y mantener trazabilidad completa de cada operación.</p>
      <p>Diseñado para una operación pequeña-mediana con dos roles:</p>
      <ul>
        <li><strong>Operador</strong>: alta de clientes, alta de préstamos, registro de pagos, consulta de dashboard.</li>
        <li><strong>Administrador</strong>: todo lo del operador + gestión de usuarios del sistema.</li>
      </ul>
    </section>

    <!-- 2. Flujo principal -->
    <section id="sec-flujo" class="manual-section">
      <h3>2. Flujo principal</h3>
      <p>Toda operación sigue 3 pasos en este orden:</p>
      <ol>
        <li><strong>Alta de cliente</strong> (Clientes → + Nuevo cliente). Cargás nombre, DNI, CUIT y subís docs.</li>
        <li><strong>Alta de préstamo</strong> (Préstamos → + Nuevo préstamo). Elegís el cliente, capital, tasa, cuotas, periodicidad y garante.</li>
        <li><strong>Registro de pagos</strong> (Pago o desde el detalle del préstamo). Cada pago amortiza capital y/o cubre intereses, y actualiza el saldo automáticamente.</li>
      </ol>
      <div class="manual-ejemplo"><strong>Ejemplo:</strong> Doy de alta a "Juan Pérez", le presto $500.000 a 6 cuotas mensuales al 7,5% mensual. Cada mes registro su pago. El sistema lleva el saldo y avisa cuando entra en mora.</div>
    </section>

    <!-- 3. Conceptos clave -->
    <section id="sec-conceptos" class="manual-section">
      <h3>3. Conceptos clave</h3>
      <div class="manual-card-grid">
        <div class="manual-mini-card"><strong>Capital</strong>El monto prestado al cliente, sin intereses.</div>
        <div class="manual-mini-card"><strong>Interés</strong>El costo del préstamo, calculado como % del capital.</div>
        <div class="manual-mini-card"><strong>Cuota</strong>Lo que el cliente paga cada periodo. Suele incluir capital + interés.</div>
        <div class="manual-mini-card"><strong>Saldo</strong>Lo que el cliente todavía debe del capital. Empieza igual al capital y baja con cada pago.</div>
        <div class="manual-mini-card"><strong>Amortización</strong>La parte de la cuota que reduce el saldo (es decir, capital, no interés).</div>
        <div class="manual-mini-card"><strong>Cuota base</strong>= Capital ÷ Total de cuotas. La parte fija de capital que se amortiza por cuota.</div>
        <div class="manual-mini-card"><strong>Tasa mensual / semanal</strong>El porcentaje de interés que se cobra por cada periodo.</div>
        <div class="manual-mini-card"><strong>Garante</strong>Persona que respalda el pago si el cliente principal no cumple. Datos obligatorios.</div>
      </div>
    </section>

    <!-- 4. Tipos de amortización -->
    <section id="sec-amortizacion" class="manual-section">
      <h3>4. Tipos de amortización</h3>
      <p>Cada préstamo se rige por uno de estos 3 sistemas. Definen cómo se calcula el interés y la cuota:</p>

      <h4>🟢 Cuota fija clásica (flat) — recomendado, el más común en Argentina</h4>
      <p>El interés se calcula <strong>siempre sobre el capital original</strong>, no sobre el saldo. La cuota es siempre la misma.</p>
      <div class="manual-formula">Cuota = (Capital ÷ N) + Capital × Tasa</div>
      <div class="manual-ejemplo"><strong>Ejemplo:</strong> $500.000 a 6 cuotas al 7,5%. Interés mensual = $500.000 × 0,075 = $37.500. Cuota base capital = $500.000 ÷ 6 = $83.333. <strong>Cuota total = $120.833</strong>, igual los 6 meses. Total a devolver: $725.000.</div>

      <h4>🔵 Cuota fija francesa (PMT)</h4>
      <p>El interés se calcula sobre el saldo. La cuota es fija pero más baja que la clásica. Usa la fórmula PMT.</p>
      <div class="manual-formula">PMT = Capital × r ÷ (1 − (1+r)<sup>−N</sup>)</div>
      <p>Al principio se paga más interés y menos capital; al final, al revés.</p>

      <h4>🟠 Cuota decreciente (alemán)</h4>
      <p>Capital fijo + interés sobre saldo. La primera cuota es la más cara y van bajando.</p>
      <div class="manual-formula">Cuota mes K = (Capital ÷ N) + Saldo<sub>K</sub> × Tasa</div>

      <div class="manual-warn"><strong>Por defecto se usa "clásica"</strong> porque es la más fácil de entender y la que más usan las financieras chicas.</div>
    </section>

    <!-- 5. Periodicidad -->
    <section id="sec-periodicidad" class="manual-section">
      <h3>5. Mensual vs. semanal</h3>
      <p>Cada préstamo se cobra mensual o semanal. Definido al momento del alta y no cambia.</p>
      <table class="manual-table">
        <thead><tr><th>Aspecto</th><th>Mensual</th><th>Semanal</th></tr></thead>
        <tbody>
          <tr><td>Plazos típicos</td><td>1 a 12 cuotas (también 18)</td><td>1 a 12 semanas</td></tr>
          <tr><td>Tasa por defecto</td><td>7,9% / 9% / 12%</td><td>3% / 4% / 5%</td></tr>
          <tr><td>Vencimiento</td><td>Cada 30 días</td><td>Cada 7 días</td></tr>
          <tr><td>Mora se activa</td><td>30 días pasado el vencimiento de la cuota</td><td>7 días pasado el vencimiento</td></tr>
        </tbody>
      </table>
      <div class="manual-ejemplo"><strong>Cuándo usar semanal:</strong> préstamos chicos a clientes que cobran semanalmente (almaceneros, vendedores ambulantes). Cuándo mensual: empleados, monotributistas, todo cliente con ingresos mensuales.</div>
    </section>

    <!-- 6. Tipos de pago -->
    <section id="sec-pagos" class="manual-section">
      <h3>6. Tipos de pago</h3>
      <p>Cuando registrás un pago, el sistema lo clasifica automáticamente:</p>
      <table class="manual-table">
        <thead><tr><th>Tipo</th><th>Cuándo</th><th>Qué pasa con el capital</th></tr></thead>
        <tbody>
          <tr>
            <td><span class="badge" style="background:#d5f5e3;color:#27ae60">Cuota completa</span></td>
            <td>El monto pagado coincide exactamente con la cuota teórica.</td>
            <td>Se amortiza la cuota base de capital y se paga el interés del periodo.</td>
          </tr>
          <tr>
            <td><span class="badge" style="background:#fef9e7;color:#f39c12">Solo interés</span></td>
            <td>El cliente paga solo el interés del periodo, sin reducir el saldo.</td>
            <td>Capital no se mueve. La deuda queda igual y se carga otro mes de interés en el próximo periodo.</td>
          </tr>
          <tr>
            <td><span class="badge" style="background:#d6eaf8;color:#2980b9">Adelanto parcial</span></td>
            <td>El monto pagado es <strong>mayor</strong> a la cuota completa.</td>
            <td>El excedente sobre el interés reduce el saldo más rápido. Quedan menos cuotas pendientes.</td>
          </tr>
          <tr>
            <td><span class="badge" style="background:#fdecea;color:#c0392b">Pago parcial</span></td>
            <td>El monto pagado es <strong>menor</strong> a la cuota completa.</td>
            <td>Cobertura incompleta. Se amortiza menos capital del esperado, queda saldo mayor.</td>
          </tr>
        </tbody>
      </table>
      <div class="manual-warn"><strong>El sistema valida:</strong> "Solo interés" exige monto = interés exacto. "Cuota completa" exige monto = cuota exacta. "Adelanto parcial" sirve para cualquier otro monto. Si te equivocás de tipo, te bloquea y te explica el motivo.</div>
    </section>

    <!-- 7. Estados -->
    <section id="sec-estados" class="manual-section">
      <h3>7. Estados del préstamo</h3>
      <table class="manual-table">
        <thead><tr><th>Estado</th><th>Significado</th><th>Transición</th></tr></thead>
        <tbody>
          <tr>
            <td><span class="badge badge-verde">Activo</span></td>
            <td>El préstamo está vigente y al día.</td>
            <td>Es el estado inicial. Pasa a Mora si vence un pago, o a Cancelado si se salda.</td>
          </tr>
          <tr>
            <td><span class="badge badge-rojo">En mora</span></td>
            <td>El próximo vencimiento ya pasó y no se registró pago.</td>
            <td>Vuelve a Activo cuando se registra el pago atrasado. Vuelve a Cancelado si se salda totalmente.</td>
          </tr>
          <tr>
            <td><span class="badge badge-verde">Cancelado</span></td>
            <td>El saldo llegó a $0. Préstamo terminado, no se pueden registrar más pagos.</td>
            <td>Se setea automáticamente cuando el saldo cae a 0 (o menos de $1 por redondeo).</td>
          </tr>
          <tr>
            <td><span class="badge" style="background:#f0f0f0;color:#888">Archivado</span></td>
            <td>Oculto de la lista principal. Para préstamos viejos o de prueba.</td>
            <td>Se archiva/desarchiva manualmente desde el detalle del préstamo.</td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- 8. Categorías -->
    <section id="sec-categorias" class="manual-section">
      <h3>8. Categorías de tasa</h3>
      <p>Las tasas no se ingresan a mano cada vez — están preconfiguradas en categorías de riesgo:</p>
      <div class="manual-card-grid">
        <div class="manual-mini-card" style="border-left-color:#27ae60"><strong>🟢 Estándar</strong>Cliente conocido, ingresos estables, historial bueno. Tasa más baja.</div>
        <div class="manual-mini-card" style="border-left-color:#f39c12"><strong>🟡 Riesgo medio</strong>Cliente nuevo o sin historial claro. Tasa intermedia.</div>
        <div class="manual-mini-card" style="border-left-color:#c0392b"><strong>🔴 Alto riesgo</strong>Cliente con antecedentes complicados o préstamo riesgoso. Tasa más alta.</div>
      </div>
      <p>Cada categoría tiene una tasa mensual <strong>y</strong> una tasa semanal independientes. Las podés editar desde el <a href="#" onclick="navigate('simulador');return false">Simulador</a>.</p>
    </section>

    <!-- 9. UIF -->
    <section id="sec-uif" class="manual-section">
      <h3>9. Documentación UIF</h3>
      <p>Por la Resolución UIF 30/2017, todo cliente debe tener legajo con esta documentación antes de operar:</p>
      <h4>Identidad</h4>
      <ul>
        <li>Fotocopia de DNI (frente y dorso)</li>
        <li>Comprobante de domicilio (boleta de luz/gas/agua, últ. 90 días)</li>
      </ul>
      <h4>Ingresos</h4>
      <ul>
        <li>Últimos 3 recibos de sueldo</li>
        <li>Constancia de inscripción en monotributo (AFIP)</li>
        <li>Últimos 3 pagos de monotributo</li>
        <li>Extracto bancario (últimos 3 meses)</li>
      </ul>
      <h4>Garantía</h4>
      <ul>
        <li>Fotocopia DNI del garante (frente y dorso)</li>
        <li>Comprobante de ingresos del garante</li>
      </ul>
      <div class="manual-warn"><strong>El sistema muestra cuántos docs faltan (X/8)</strong>. No bloquea operaciones, pero conviene tenerlo completo por si hay auditoría.</div>
    </section>

    <!-- 10. Dashboard -->
    <section id="sec-dashboard" class="manual-section">
      <h3>10. Métricas del dashboard</h3>
      <p>Filtro común: solo préstamos vivos (activos + en mora). Cancelados y archivados quedan fuera.</p>
      <table class="manual-table">
        <thead><tr><th>Métrica</th><th>Qué es</th><th>Fórmula</th></tr></thead>
        <tbody>
          <tr><td><strong>Capital en cartera</strong></td><td>Plata que tenés prestada hoy</td><td>SUM(monto_capital) de vivos</td></tr>
          <tr><td><strong>Capital recuperado</strong></td><td>Capital ya cobrado (sin intereses)</td><td>SUM(capital_amortizado) de pagos de vivos</td></tr>
          <tr><td><strong>Capital pendiente</strong></td><td>Capital que falta cobrar</td><td>Cartera − Recuperado</td></tr>
          <tr><td><strong>Intereses cobrados</strong></td><td>Ganancia neta acumulada</td><td>SUM(interes_pagado) de pagos de vivos</td></tr>
          <tr><td><strong>Préstamos activos</strong></td><td>Cantidad de préstamos vivos</td><td>COUNT de vivos</td></tr>
          <tr><td><strong>En mora</strong></td><td>Préstamos con pago vencido sin registrar</td><td>Activos cuyo próximo vencimiento ya pasó</td></tr>
        </tbody>
      </table>
      <div class="manual-ejemplo"><strong>Ecuación clave:</strong> <code>Recuperado + Pendiente = Cartera</code>. Si no cuadra, es un bug. Reportalo.</div>
    </section>

    <!-- 11. Plata de terceros -->
    <section id="sec-terceros" class="manual-section">
      <h3>11. Plata de terceros (inversores)</h3>
      <p>Además de prestar plata propia, la financiera <strong>recibe capital de inversores</strong> y se lo
        devuelve con interés. Es el espejo exacto de un préstamo, pero con los roles invertidos:
        acá <strong>la financiera es la deudora</strong> y el inversor es el acreedor.</p>

      <div class="manual-warn"><strong>Préstamo vs. Captación.</strong> En un <em>préstamo</em> la financiera
        presta y cobra (es acreedora). En una <em>captación</em> la financiera recibe y devuelve (es deudora).
        Por eso la pantalla y los contratos hablan de "devolución" y no de "cobro".</p>

      <h4>El flujo, paso a paso</h4>
      <ol>
        <li><strong>Alta de inversor</strong> (Inversores → + Nuevo inversor). Nombre, DNI, CUIT, domicilio y
          datos bancarios (CBU/alias) para transferirle las devoluciones.</li>
        <li><strong>Alta de captación</strong> (Captaciones → + Nueva captación). Elegís el inversor, el capital
          aportado, la tasa que le pagás, la cantidad de cuotas, la periodicidad y el tipo de amortización.</li>
        <li><strong>Registro de devoluciones</strong>. Cada vez que le pagás al inversor, registrás una devolución.
          El sistema amortiza capital y/o paga interés y baja el saldo a devolver — igual que un pago, pero al revés.</li>
      </ol>

      <h4>Diccionario rápido (préstamo → captación)</h4>
      <table class="manual-table">
        <thead><tr><th>En préstamos</th><th>En captaciones</th><th>Qué es</th></tr></thead>
        <tbody>
          <tr><td>Cliente</td><td><strong>Inversor</strong></td><td>La contraparte. Acá es quien pone la plata.</td></tr>
          <tr><td>Préstamo</td><td><strong>Captación</strong></td><td>El capital recibido a devolver con interés.</td></tr>
          <tr><td>Pago</td><td><strong>Devolución</strong></td><td>Cada entrega de plata al inversor.</td></tr>
          <tr><td>Recibo de pago</td><td><strong>Recibo de devolución</strong></td><td>Comprobante PDF que firma el inversor al recibir.</td></tr>
          <tr><td>Saldo del cliente</td><td><strong>Saldo a devolver</strong></td><td>Capital que todavía le debés al inversor.</td></tr>
        </tbody>
      </table>

      <h4>Tipos de devolución</h4>
      <p>Funcionan igual que los tipos de pago (sección 6): <strong>Cuota completa</strong> (capital + interés del
        periodo), <strong>Solo interés</strong> (le pagás el rendimiento del mes y el capital queda intacto) y
        <strong>Adelanto parcial</strong> (cualquier otro monto; el excedente sobre el interés reduce el saldo).</p>
      <div class="manual-ejemplo"><strong>Ejemplo:</strong> Un inversor aporta $1.000.000 a 12 meses al 5% mensual,
        amortización clásica. Le devolvés cada mes $83.333 de capital + $50.000 de interés = $133.333. Si un mes solo
        le pagás el interés ($50.000), el capital sigue en $1.000.000 y al mes siguiente se vuelve a generar interés.</div>

      <h4>Documentos que genera</h4>
      <ul>
        <li><strong>Contrato de mutuo</strong> (DOCX): se descarga desde el detalle de la captación. Es un mutuo
          privado individual donde el inversor figura como acreedor y la financiera como deudora.</li>
        <li><strong>Recibo de devolución</strong> (PDF): se descarga desde cada devolución en el historial. Tiene
          dos copias (financiera e inversor) y una línea de firma para el inversor.</li>
      </ul>

      <h4>Estados de una captación</h4>
      <table class="manual-table">
        <thead><tr><th>Estado</th><th>Significado</th></tr></thead>
        <tbody>
          <tr><td><span class="badge badge-verde">Activa</span></td><td>Vigente, todavía le debés capital al inversor.</td></tr>
          <tr><td><span class="badge badge-verde">Devuelta</span></td><td>El saldo a devolver llegó a $0. Captación cerrada.</td></tr>
          <tr><td><span class="badge" style="background:#f0f0f0;color:#888">Archivada</span></td><td>Oculta de la lista principal.</td></tr>
        </tbody>
      </table>

      <div class="manual-warn"><strong>Cuidado con confundir las dos puntas.</strong> La plata que captás de un
        inversor (pasivo, la devolvés) no es lo mismo que la plata que prestás a un cliente (activo, la cobrás).
        El reporte de balance separa una de la otra.</div>
    </section>

    <!-- 12. FAQ -->
    <section id="sec-faq" class="manual-section">
      <h3>12. FAQ — Preguntas frecuentes</h3>

      <h4>¿Por qué no puedo borrar un cliente?</h4>
      <p>Para mantener trazabilidad. Si un cliente ya no opera, dejalo así o agregale una observación. Sus préstamos quedan en el historial.</p>

      <h4>Un cliente quiere pagar antes de tiempo. ¿Qué hago?</h4>
      <p>Registrá el pago como <strong>Adelanto parcial</strong> con el monto que el cliente trae. El sistema calcula el interés del periodo y todo el resto va a reducir saldo. Las cuotas restantes se recalculan automáticamente.</p>

      <h4>Un cliente paga menos de lo que debe. ¿Le rechazo el pago?</h4>
      <p>No. Registralo como <strong>Adelanto parcial</strong> con el monto real. El sistema lo va a clasificar como <strong>Pago parcial</strong> en el detalle (badge rojo), para que veas en cualquier momento que ese pago no cubrió la cuota completa.</p>

      <h4>El cliente solo me trae el interés del mes. ¿Es válido?</h4>
      <p>Sí — usá el tipo <strong>Solo interés</strong>. El capital queda intacto y el mes próximo se carga otro interés sobre el mismo saldo. Útil si el cliente atraviesa una mala racha.</p>

      <h4>¿Qué pasa si me equivoco al registrar un pago?</h4>
      <p>Podés eliminarlo desde el detalle del préstamo (botón ✕ en la fila del pago). El sistema recalcula los saldos automáticamente.</p>

      <h4>¿Cómo cancelo un préstamo manualmente?</h4>
      <p>No hace falta: cuando registrás el pago que lleva el saldo a $0, el sistema lo cancela solo. Si querés "esconder" un préstamo, usá <strong>Archivar</strong>.</p>

      <h4>¿Puedo cambiar la tasa de un préstamo ya iniciado?</h4>
      <p>No directamente. Tendrías que dar de baja (archivar) el préstamo y crear uno nuevo con la tasa ajustada.</p>

      <h4>¿Por qué un préstamo me sale "en mora" si el cliente está al día?</h4>
      <p>El sistema calcula la mora sumando "30 días × cuotas pagadas" (o "7 días" si es semanal) desde el primer vencimiento. Si el cliente paga adelantado, igualmente el sistema espera que pasen los 30/7 días — pero no debería marcarlo en mora. Si lo ves, contame.</p>
    </section>

    <!-- 12. Glosario -->
    <section id="sec-glosario" class="manual-section">
      <h3>13. Glosario</h3>
      <dl style="font-size: .9rem; line-height: 1.6;">
        <dt style="font-weight: 700; color: var(--ink, #1b4332); margin-top: .5rem">Amortización</dt>
        <dd style="margin-left: 1.2rem; color: var(--ink-2, #4a4a4a)">Reducción del capital adeudado por un pago. No incluye intereses.</dd>

        <dt style="font-weight: 700; color: var(--ink, #1b4332); margin-top: .5rem">Capital</dt>
        <dd style="margin-left: 1.2rem; color: var(--ink-2, #4a4a4a)">Monto original prestado, sin contar intereses.</dd>

        <dt style="font-weight: 700; color: var(--ink, #1b4332); margin-top: .5rem">Captación</dt>
        <dd style="margin-left: 1.2rem; color: var(--ink-2, #4a4a4a)">Capital recibido de un inversor que la financiera debe devolver con interés. Espejo de un préstamo, con la financiera como deudora.</dd>

        <dt style="font-weight: 700; color: var(--ink, #1b4332); margin-top: .5rem">CUIT / CUIL</dt>
        <dd style="margin-left: 1.2rem; color: var(--ink-2, #4a4a4a)">Clave Única de Identificación Tributaria (Laboral). Validado con dígito verificador.</dd>

        <dt style="font-weight: 700; color: var(--ink, #1b4332); margin-top: .5rem">Cuota base</dt>
        <dd style="margin-left: 1.2rem; color: var(--ink-2, #4a4a4a)">Capital ÷ Total de cuotas. La parte fija de capital que se amortiza cada periodo.</dd>

        <dt style="font-weight: 700; color: var(--ink, #1b4332); margin-top: .5rem">Devolución</dt>
        <dd style="margin-left: 1.2rem; color: var(--ink-2, #4a4a4a)">Cada pago que la financiera le hace a un inversor por una captación. Equivale al "pago" de un préstamo.</dd>

        <dt style="font-weight: 700; color: var(--ink, #1b4332); margin-top: .5rem">Garante</dt>
        <dd style="margin-left: 1.2rem; color: var(--ink-2, #4a4a4a)">Persona que respalda el pago del préstamo. Sus datos (nombre, DNI, CUIL, domicilio) son obligatorios.</dd>

        <dt style="font-weight: 700; color: var(--ink, #1b4332); margin-top: .5rem">Interés</dt>
        <dd style="margin-left: 1.2rem; color: var(--ink-2, #4a4a4a)">Costo del préstamo expresado como % del capital o saldo.</dd>

        <dt style="font-weight: 700; color: var(--ink, #1b4332); margin-top: .5rem">Inversor</dt>
        <dd style="margin-left: 1.2rem; color: var(--ink-2, #4a4a4a)">Tercero que aporta capital a la financiera. Es el acreedor de una captación: pone la plata y se le devuelve con interés.</dd>

        <dt style="font-weight: 700; color: var(--ink, #1b4332); margin-top: .5rem">Legajo</dt>
        <dd style="margin-left: 1.2rem; color: var(--ink-2, #4a4a4a)">Identificador único de un cliente (C-0001) o préstamo (P-0001).</dd>

        <dt style="font-weight: 700; color: var(--ink, #1b4332); margin-top: .5rem">Mora</dt>
        <dd style="margin-left: 1.2rem; color: var(--ink-2, #4a4a4a)">Estado de un préstamo cuyo próximo vencimiento ya pasó sin pago registrado.</dd>

        <dt style="font-weight: 700; color: var(--ink, #1b4332); margin-top: .5rem">Mutuo</dt>
        <dd style="margin-left: 1.2rem; color: var(--ink-2, #4a4a4a)">Contrato de préstamo de dinero entre privados. En una captación el inversor (acreedor) le presta a la financiera (deudora).</dd>

        <dt style="font-weight: 700; color: var(--ink, #1b4332); margin-top: .5rem">PMT</dt>
        <dd style="margin-left: 1.2rem; color: var(--ink-2, #4a4a4a)">Fórmula para calcular la cuota fija en el sistema francés.</dd>

        <dt style="font-weight: 700; color: var(--ink, #1b4332); margin-top: .5rem">Saldo</dt>
        <dd style="margin-left: 1.2rem; color: var(--ink-2, #4a4a4a)">Capital adeudado en un momento dado. Empieza igual al capital y baja con cada pago.</dd>

        <dt style="font-weight: 700; color: var(--ink, #1b4332); margin-top: .5rem">Tasa mensual / semanal</dt>
        <dd style="margin-left: 1.2rem; color: var(--ink-2, #4a4a4a)">Porcentaje de interés cobrado por periodo (mes o semana).</dd>

        <dt style="font-weight: 700; color: var(--ink, #1b4332); margin-top: .5rem">UIF</dt>
        <dd style="margin-left: 1.2rem; color: var(--ink-2, #4a4a4a)">Unidad de Información Financiera. Obliga a registrar DNI, CUIT y documentación respaldatoria.</dd>
      </dl>
    </section>

    <div style="text-align: center; padding: 1.5rem 0; color: var(--ink-3, #888); font-size: .82rem">
      <em>Manual generado por EM-Financiera · Para sugerencias o correcciones, contactá al administrador.</em>
    </div>
  `;

  // Smooth scroll para anchors del TOC
  app.querySelectorAll('.manual-toc a').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const target = document.querySelector(link.getAttribute('href'));
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}
