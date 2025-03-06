const qc = require("node-cache");
const queryCache = new qc({ stdTTL: 600, checkperiod: 300 } );
// route query
const sql = (params, query) => {
	console.log(params)
	console.log(query)

	const geoFilter =(query.districtid)?`AND districtid='${query.districtid}'`:'';

	const preOrPost = query.prepost === 'pre' ? '<=' : query.prepost === 'post' ? '>' : false;
		const statementColName = params.table === 'vw_contributionsbyelectedoffice' ? 'statement_no_totals' : 'statement_no';

	const prePostFilter = !preOrPost?'': `AND ${statementColName} ${preOrPost} ${query.cutoff}`;



	let tableStatement = `SELECT districtid, districtname, SUM(contribtotamt) AS total_sum, SUM(contribtotnum) AS total_num
	FROM ${params.table}
	where curcode='${query.curcode}' ${geoFilter} ${prePostFilter}
	GROUP BY districtid, districtname;`

	console.log(tableStatement)
    return tableStatement
}

// route schema
const schema = {
  description: 'Query a table or view.',
  tags: ['api'],
  summary: 'table query',
  params: {
    table: {
      type: 'string',
      description: 'The name of the table or view.'
    }
  },
  querystring: {
    districtid:{
      type: 'string',
      description: "Geo code eg. 10001"
    },
    curcode: {
      type: 'string',
      description: 'Curcode filter eg. AllAll'
    }
  }
}

// create route
module.exports = function (fastify, opts, next) {
  fastify.route({
    method: 'GET',
    url: '/sumByGeoAndCode/:table',
    schema: schema,
    handler: function (request, reply) {
      fastify.pg.connect(onConnect)
      console.log('connect')
      function onConnect(err, client, release) {
        if (err) return reply.send({
          "statusCode": 500,
          "error": "Internal Server Error",
          "message": "unable to connect to database server"
        })
        
        const key = request.url
        const cachedResp = queryCache.get(key);
        console.log('cached: ',typeof cachedResp !== 'undefined');
        if (typeof cachedResp !== 'undefined') {
          release();
          reply.send(cachedResp);
        } else {
         console.log('not cached')
          client.query(
            sql(request.params, request.query),
            function onResult(err, result) {
              if(err) console.log(sql(request.params, request.query))
              release()
              reply.send(err || result.rows)
              if (result && typeof result !== 'undefined' && result.rows){
                queryCache.set(key, result.rows, 900)
              }
            }
          )
        }
      }
    }
  })
  next()
}

module.exports.autoPrefix = '/v2'
