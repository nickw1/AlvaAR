import { Stats, AlvaAR, ARSimpleView, ARSimpleMap, Video, onFrame } from 'alva-js';

async function main()
{
    document.body.appendChild( Stats.el );
    Stats.add( 'total' );
    Stats.add( 'video' );
    Stats.add( 'slam' );

    const media = await Video.Initialize( './assets/video.mp4' );
    const alva = await AlvaAR.Initialize( media.width, media.height );

    const $cam = document.getElementById( 'renderer-cam' );
    const $map = document.getElementById( 'renderer-map' );
    const ctx = document.getElementById( 'renderer-video' ).getContext( '2d' );

    ctx.canvas.width = media.width;
    ctx.canvas.height = media.height;

    const mapRenderer = new ARSimpleMap( $map, media.width, media.height );
    const camRenderer = new ARSimpleView( $cam, media.width, media.height, mapRenderer );

    let doFindPlane = false;

    $cam.addEventListener( 'click', ( event ) => doFindPlane = true );
    $cam.parentElement.style.display = 'block';

    media.el.play();
    media.el.loop = false;
    media.el.onended = ( event ) =>
    {
        media.el.load();
        media.el.play();
        camRenderer.reset();
    };

    onFrame( () =>
    {
        Stats.next();
        Stats.start( 'total' );

        Stats.start( 'video' );
        const frame = media.getImageData();
        ctx.clearRect( 0, 0, media.width, media.height );
        ctx.putImageData( frame, 0, 0 );
        Stats.stop( 'video' );

        Stats.start( 'slam' );
        const pose = alva.findCameraPose( frame );
        Stats.stop( 'slam' );

        if( pose )
        {
            camRenderer.updateCameraPose( pose );

            if( doFindPlane )
            {
                const planePose = alva.findPlane();

                if( planePose )
                {
                    camRenderer.createObjectWithPose( planePose );
                    doFindPlane = false;
                }
            }
        }
        else
        {
            camRenderer.lostCamera();

            const dots = alva.getFramePoints();

            for( const p of dots )
            {
                ctx.fillStyle = 'white';
                ctx.fillRect( p.x, p.y, 2, 2 );
            }
        }

        Stats.stop( 'total' );
        Stats.render();

        return true;
    }, 30 );
}

window.addEventListener( 'load', main );
