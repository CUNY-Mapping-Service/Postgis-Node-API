const _args = process.argv.slice(2);
const url = `/get-sources`;

const schema = {
    description: 'Get sources from all tables and views that have geom column',
    tags: ['meta'],
    summary: 'Get sources from all tables and views that have geom column'
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
                  //  const tilejson = fs.readFileSync(`${cacheFolder}/tile.json`, 'utf8');
                    // parse JSON string to JSON object
                    let _json = {urls:[]};

                    client.query(
                        sql(),
                        function onResult(err, result) {
                            release()

                            if (result && typeof result !== 'undefined' && result.rows) {

                               

                                //Filter for geom tables only (Could also do this postgres but it's not)
                                const geomRows = result.rows.filter(r=>r.columns.includes('geom' || r.columns.includes('geom_pt')));
                               // console.log(geomRows)

                                geomRows.forEach(row => {
                                    const cols = row.columns.filter(c => c !== 'geom').join(',');

                                    const tileURL = `https://${process.env.PUBLIC_HOST}${process.env.URL_PATH}v1/mvt/${row.schema[0]}.${row.table_name}/{z}/{x}/{y}?geom_column=geom&columns=${cols}`;
                                    _json.urls.push({
                                        url:tileURL,
                                        schema:row.schema[0],
                                        tableName:row.table_name,
                                        columns: cols                                        
                                    });

                                });
                            }

                            // const data = JSON.stringify(_json, null, 4);
                            // fs.writeFile(`${cacheFolder}/tile.json`, data, () => {
                            //     reply.send(err || data)
                            // })
                            reply.code(200).send(_json)
                        }
                    )

                  //  reply.code(200).send(_json)

                } catch (err) {
                    console.log(`Error reading file from disk: ${err}`)
                    reply.code(500).send(err)

                }
            }
        }
    })
    next()
}