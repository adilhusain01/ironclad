// Sets the theme before the page draws: the visitor's last choice, else light.
(function () {
  var saved;
  try {
    saved = localStorage.getItem("ironclad.site.theme");
  } catch (error) {}
  document.documentElement.dataset.theme = saved === "dark" ? "dark" : "light";
})();
