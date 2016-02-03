window.$ = window.jQuery = require('jquery');
require("babelify-es6-polyfill");
var constants = require("./constants");
var Handlebars = require('Handlebars');

let FractalAchievementType = {
  SCALE: 1,
  RANGE: 2,
  UNKNOWN: -1
}

$(document).ready(function () {
  let fractal_category_url = `${constants.API_URL}${constants.ACHIEVEMENT_CATEGORY_ENDPOINT}${constants.FRACTAL_DAILY_CATEGORY}`

  let categoryPromise = Promise.resolve($.ajax(fractal_category_url));

  categoryPromise.then(function (obj) {
    let ids = obj.achievements;

    let promises = Promise.all(ids.map(function (id) {
      let achievement_url = `${constants.API_URL}${constants.ACHIEVEMENT_ENDPOINT}${id}`;
      return Promise.resolve($.ajax(achievement_url));
    })).then(function (results) {
      let buckets = results.map(classify_achievement).filter(function (classified) {
        return classified.type == FractalAchievementType.RANGE;
      }).map(function (bucket) {
        let swamplands = constants.FRACTALS.filter(function (fractal) {
          return fractal.scale >= bucket.from && fractal.scale < bucket.to && fractal.map.indexOf("Swampland") > -1;
        });

        let molten = constants.FRACTALS.filter(function (fractal) {
          return fractal.scale >= bucket.from && fractal.scale < bucket.to && fractal.map.indexOf("Molten Boss") > -1;
        });

        let dailies = results.map(classify_achievement).filter(function (classified) {
          return classified.type == FractalAchievementType.SCALE
            && classified.scale >= bucket.from
              && classified.scale < bucket.to;
        });

        let achievies = dailies.concat(swamplands, molten).slice(0,3);

        achievies.sort(function (f1, f2) { return f1.scale - f2.scale});

        bucket["scales"] = achievies;

        return bucket;
      });

      console.log(buckets);

      var source = $("#category-template").html();
      var template = Handlebars.compile(source);

      var context = {buckets: buckets};
      var html = template(context);

      $("#main").append(html);
    });
  });
})

function classify_achievement (achievement) {
  let scale_matcher = /scale (\d+)/i;
  let range_matcher = /scale (\d+).(\d+)/i;

  let match;

  if (match = achievement.requirement.match(range_matcher)) {
    return {
      "type": FractalAchievementType.RANGE,
      "from": parseInt(match[1]),
      "to": parseInt(match[2]),
      "achievement": achievement
    };
  } else if (match = achievement.name.match(scale_matcher)) {
    return $.extend({
      "type": FractalAchievementType.SCALE,
      "scale": parseInt(match[1]),
      "achievement": achievement
    }, constants.FRACTALS.find(function (elem) { return elem.scale == match[1]}));
  } else {
    return {
      "type": FractalAchievementType.UNKNOWN,
      "achievement": achievement
    }
  }
}
