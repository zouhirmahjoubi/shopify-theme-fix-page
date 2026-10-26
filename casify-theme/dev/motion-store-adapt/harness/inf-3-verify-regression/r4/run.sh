cd "/e/Shopify Theme Fix & Page/casify-theme/dev/motion-store-adapt/tools"
OUT=../harness/inf-3-verify-regression/r4
P=../harness/inf-3-commerce-motion-preview.html
timeout 400 python -I shoot.py $P --out $OUT/shots-default --rm --actions ../harness/inf-3/actions.py > $OUT/shoot-default.txt 2>&1; echo "default exit $?" >> $OUT/status.txt
timeout 400 python -I shoot.py $P --out $OUT/shots-nomp --only default --query nomp=1 --actions ../harness/inf-3/actions.py > $OUT/shoot-nomp.txt 2>&1; echo "nomp exit $?" >> $OUT/status.txt
timeout 300 python -I shoot.py $P --out $OUT/shots-nogsap --only default --query nogsap=1 --actions ../harness/inf-3/actions.py > $OUT/shoot-nogsap.txt 2>&1; echo "nogsap exit $?" >> $OUT/status.txt
timeout 300 python -I shoot.py $P --out $OUT/shots-editor --only default --widths 375 --no-scroll --query editor=4 > $OUT/shoot-editor.txt 2>&1; echo "editor exit $?" >> $OUT/status.txt
echo done >> $OUT/status.txt
