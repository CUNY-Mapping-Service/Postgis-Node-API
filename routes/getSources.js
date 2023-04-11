const _args = process.argv.slice(2);
const deployPath = _args[0] || '.';
const fs = require("fs-extra");
const config = require('../config')
const url = `/get-sources`;
const os = process.env.OS || 'WIN';

const schema = {
    description: 'Get tilejson with all tables and views that have geom column',
    tags: ['meta'],
    summary: 'Get tilejson with all tables and views that have geom column'
}

const sql = () => {
    return `
    select
        t.table_name,
        array_agg(c.column_name::text) as columns,
        array_agg(c.table_schema::text) as schema
    from
        information_schema.tables t
    inner join information_schema.columns c on
        t.table_name = c.table_name
    where
        (t.table_type = 'BASE TABLE'
        or t.table_type = 'VIEW')
        and t.table_schema not in  ('pg_catalog', 'information_schema')
    group by t.table_name;
    `
}



module.exports = function (fastify, opts, next) {


    fastify.route({
        method: 'GET',
        url: url,
        schema: schema,
        // preHandler: (request, reply, done) => {
        //     if(request.headers['x-api-key']!==process.env.PASSWORD){
        //         reply
        //             .code(500)
        //             .send('Authorization required')
        //         console.log('no pw')
        //     }else{
        //     	console.log('good pw')
        //     }
        //     done();
        // },
        handler: function (request, reply) {
            const cacheFolder = `${process.argv.slice(2)[0]}` || '.';

            fastify.pg.connect(onConnect)

            function onConnect(err, client, release) {
                if (err) console.log(err)
                if (err) return reply.send({
                    "statusCode": 500,
                    "error": "Internal Server Error",
                    "message": "unable to connect to database server"
                })

                try {
                    const tilejson = fs.readFileSync(`${cacheFolder}/tile.json`, 'utf8');
                    // parse JSON string to JSON object
                    const _json = {};

                    client.query(
                        sql(),
                        function onResult(err, result) {
                            release()

                            if (result && typeof result !== 'undefined' && result.rows) {
                                //Empty tile array
<<<<<<< HEAD:routes/tilejson.js
                                _json.tiles.length = 0;
                                _json.vector_layers.length=0;
=======
                                _json.urls.length = 0;

>>>>>>> 21e500071c25962feffb73c65aeefe2c21163e9d:routes/getSources.js
                                //Filter for geom tables only (Could also do this postgres but it's not)
                                const geomRows = result.rows.filter(r=>r.columns.includes('geom' || r.columns.includes('geom_pt')));

                                geomRows.forEach(row => {
                                    const cols = row.columns.filter(c => c !== 'geom').join(',');
<<<<<<< HEAD:routes/tilejson.js
                                    const tileURL = `https://${process.env.PUBLIC_HOST}/${process.env.URL_PATH}v1/mvt/${row.schema[0]}.${row.table_name}/{z}/{x}/{y}?geom_column=geom&columns=${cols}&useCache=false`;
                                    _json.tiles.push(tileURL);

                                    let layer = {};
                                    layer.id=`${row.schema[0]}.${row.table_name}`;

                                    layer.fields={};
                                    row.columns.forEach(col=>{
                                    	layer.fields[col] = col;
                                    });

							        _json.vector_layers.push(layer)

=======
                                    const tileURL = `https://${process.env.PUBLIC_HOST}/${process.env.URL_PATH}v1/mvt/${row.schema[0]}.${row.table_name}/{z}/{x}/{y}?geom_column=geom&columns=${cols}`;
                                    _json.urls.push({
                                        url:tileURL,
                                        sourceLayer:`${row.schema[0]}.${row.table_name}`
                                    });
                                    //_json.vector_layers.push(`${row.schema[0]}.${row.table_name}`)
>>>>>>> 21e500071c25962feffb73c65aeefe2c21163e9d:routes/getSources.js
                                    //Include separate point geom tables
                                    // if(cols.includes('geom_pt')){
                                    //     _json.tiles.push(tileURL.replace('geom_column=geom','geom_column=geom_pt'));
                                    // }
                                });
                            }

                            // const data = JSON.stringify(_json, null, 4);
                            // fs.writeFile(`${cacheFolder}/tile.json`, data, () => {
                            //     reply.send(err || data)
                            // })
                            reply.code(200).send(_json)
                        }
                    )

                    reply.code(200).send(_json)

                } catch (err) {
                    console.log(`Error reading file from disk: ${err}`)
                    reply.code(500).send(err)

                }
            }
        }
    })
    next()
}