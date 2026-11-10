/* Pagina de vagas e curriculos (/rh/), 10/11/2026. Carregado com defer (DOM pronto).
   Sem este arquivo o formulario continua funcionando; ele so ajuda o candidato:
   - "Quero esta vaga" ja escolhe a vaga no cadastro;
   - escolhendo "Banco de talentos", a autorizacao de guardar o curriculo passa a ser obrigatoria (LGPD, art. 7.o, I);
   - arquivo acima de 5 MB ou fora de PDF/Word e recusado antes do envio, com aviso. */
(function(){
  var fm = document.getElementById('fm-rh');
  if (!fm) return;
  var sel = document.getElementById('f-vaga'), bt = document.getElementById('f-bt'), btObr = document.getElementById('f-bt-obr');
  var cv = document.getElementById('f-cv'), err = document.getElementById('f-cv-err');
  var BANCO = 'Banco de talentos (vagas futuras)', MAX = 5 * 1024 * 1024;

  function banco(){
    var e = sel.value === BANCO;
    bt.required = e;
    btObr.hidden = !e;
  }
  sel.addEventListener('change', banco);
  banco();

  [].forEach.call(document.querySelectorAll('[data-vaga]'), function(a){
    a.addEventListener('click', function(){
      var v = a.getAttribute('data-vaga');
      for (var i = 0; i < sel.options.length; i++) if (sel.options[i].value === v){ sel.selectedIndex = i; break; }
      banco();
    });
  });

  cv.addEventListener('change', function(){
    var f = cv.files && cv.files[0], msg = '';
    if (f && f.size > MAX) msg = 'O arquivo tem ' + (f.size / 1048576).toFixed(1).replace('.', ',') + ' MB. O limite é 5 MB: salve o currículo em PDF, que costuma ficar bem menor.';
    else if (f && !/\.(pdf|docx?)$/i.test(f.name)) msg = 'Mande o currículo em PDF ou Word (.pdf, .doc ou .docx).';
    cv.setCustomValidity(msg);
    err.textContent = msg;
    err.hidden = !msg;
  });
})();
