module.exports = {
  beforeRequest: (requestParams, context, ee, next) => {
    // Kezdő időpont rögzítése
    context.startedAt = process.hrtime();
    return next();
  },

  afterResponse: (requestParams, response, context, ee, next) => {
    const hrend = process.hrtime(context.startedAt);
    const duration = (hrend[0] * 1000 + hrend[1] / 1000000).toFixed(2); // ms-ben

    // Endpoint azonosítása és normalizálása
    const endpoint = requestParams.url.replace(/\/\d+/g, "/:id");

    // Metrikák kibocsátása
    ee.emit("customStat", {
      stat: `endpoints.${endpoint}.response_time`,
      value: parseFloat(duration),
    });

    // Státuszkód tracking
    ee.emit("customStat", {
      stat: `endpoints.${endpoint}.status.${response.statusCode}`,
      value: 1,
    });

    // Konzolra írás (opcionális, debug célokra)
    console.log(`${endpoint}: ${duration}ms [${response.statusCode}]`);

    return next();
  },
};
