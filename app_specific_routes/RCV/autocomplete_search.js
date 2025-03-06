// route query
const sql = (params, query) => {
  //   select districtname, geoid, stusps from congress_demographics
  // where geoid LIKE '%' || '' || '%'
  // or districtname LIKE '%' || '' || '%'
  // or statename LIKE '%' || '' || '%'
  // or stusps=''
  // limit 10;
  const limit = 500;
  const columns = 'districtname, statename, geoid, stusps'
  let whereArray = []


  const terms = params.term.split(' ');

  for (let t=0; t<terms.length; t++) {
    whereArray.push('(');
    whereArray.push(getStateName(terms[t]));
    whereArray.push(' OR ');

    if (terms[t].length < 3) {
      whereArray.push(getStUSPS(terms[t]));
      whereArray.push(' OR ');
    }
    
    whereArray.push(getDistLabel(terms[t]));
    whereArray.push(')');

    if(t<terms.length-1) whereArray.push(' AND ');
  }

  const whereClause = whereArray.join('');

  const postgresQuery = `
  SELECT 
    ${columns}

  FROM 
  ${params.table}
 
  ${whereClause.length > 0 ? `WHERE ${whereClause}`: ''}

  ${limit ? `LIMIT ${limit}` : '' };
  `

 
  return postgresQuery
}

function getDistLabel(_query) {
  return `position('${_query}' in geoid) > 0`;
}

function getStateName(_query) {
  return `position('${capitalize(_query)}' in statename) > 0`
}

function getStUSPS(_query) {
  return `position('${_query.toUpperCase()}' in stusps) > 0`
}

const capitalize = (s) => {
  if (typeof s !== 'string') return s
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// route schema
const schema = {
  description: 'Autocomplete',
  tags: ['api'],
  summary: 'autocomplete query',
  params: {
    search: {
      type: 'string',
      description: 'users query string'
    },
    table: {
      type: 'string',
      description: 'The name of the table or view.'
    }
  },
  querystring: {}
}

// create route
module.exports = function (fastify, opts, next) {
  fastify.route({
    method: 'GET',
    url: '/autocomplete/:table/:term',
    schema: schema,
    handler: function (request, reply) {
      fastify.pg.connect(onConnect)

      function onConnect(err, client, release) {
        if (err) return reply.send({
          "statusCode": 500,
          "error": "Internal Server Error",
          "message": "unable to connect to database server"
        })

        client.query(
          sql(request.params, request.query),
          function onResult(err, result) {
            release()
            reply.send(err || result.rows)
          }
        )
      }
    }
  })
  next()
}

module.exports.autoPrefix = '/v2'