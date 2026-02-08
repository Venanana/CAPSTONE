function loadHTML(id, file, cb) {
  fetch(file)
    .then(res => res.text())
    .then(data => {
      if (id) {
        const el = document.getElementById(id);
        if (el) el.innerHTML = data;
      } else {
        // append shared templates to body (hidden)
        const div = document.createElement('div');
        div.id = 'shared-templates';
        div.style.display = 'none';
        div.innerHTML = data;
        document.body.appendChild(div);
      }
      if (typeof cb === 'function') cb();
    });
}

function injectTemplates(){
  document.querySelectorAll('[data-template]').forEach(function(container){
    var tplId = container.getAttribute('data-template');
    var tpl = document.getElementById(tplId);
    if(tpl){
      container.innerHTML = tpl.innerHTML;

      // make radio names unique per panel to avoid cross-form grouping
      var panel = container.closest('.form-panel');
      var panelId = panel ? panel.id : 'panel';
      container.querySelectorAll('input[type="radio"]').forEach(function(r){
        var base = r.getAttribute('name') || 'voter';
        r.setAttribute('name', base + '-' + panelId);
      });
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadHTML("header", "../shared/header.html");
  loadHTML("sidebar", "../shared/sidebar.html");
  loadHTML("footer", "../shared/footer.html");

  // load shared templates then inject into placeholders
  // load main components, then construction-permit file, then inject templates
  loadHTML(null, "../shared/components.html", function(){
    loadHTML(null, "../shared/construction-permit.html", function(){
      injectTemplates();
      window.dispatchEvent(new Event('templatesLoaded'));
    });
  });
});
