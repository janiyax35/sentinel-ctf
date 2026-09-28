/* Rules page — just needs the top chrome and an auth guard */
(async function () {
  if (!(await App.guard())) return;
  await App.chrome("rules");
})();
