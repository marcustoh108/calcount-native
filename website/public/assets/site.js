// Mobile menu: close it after a link is chosen, on Escape, or when tapping elsewhere.
(function () {
  var menus = document.querySelectorAll("details.menu");
  menus.forEach(function (menu) {
    menu.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () { menu.open = false; });
    });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") menus.forEach(function (m) { m.open = false; });
  });
  document.addEventListener("click", function (e) {
    menus.forEach(function (m) { if (m.open && !m.contains(e.target)) m.open = false; });
  });
})();
